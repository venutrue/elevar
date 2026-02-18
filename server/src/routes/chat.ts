import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list chat rooms for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);

    const result = await query(
      `SELECT cr.*,
              (SELECT message_body FROM chat_messages cm WHERE cm.chat_room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM chat_messages cm WHERE cm.chat_room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message_at
       FROM chat_rooms cr
       JOIN chat_room_participants crp ON crp.chat_room_id = cr.id
       WHERE crp.user_id = $1
       ORDER BY COALESCE(
         (SELECT created_at FROM chat_messages cm WHERE cm.chat_room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1),
         cr.created_at
       ) DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List chat rooms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get chat room by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT cr.*
       FROM chat_rooms cr
       JOIN chat_room_participants crp ON crp.chat_room_id = cr.id
       WHERE cr.id = $1 AND crp.user_id = $2`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Chat room not found' });
      return;
    }

    // Also fetch participants
    const participants = await query(
      `SELECT crp.*, u.first_name, u.last_name, u.email
       FROM chat_room_participants crp
       JOIN app_users u ON u.id = crp.user_id
       WHERE crp.chat_room_id = $1`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      participants: participants.rows,
    });
  } catch (err) {
    console.error('Get chat room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create chat room and add creator as participant
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subject, room_type, property_id, participant_ids } = req.body;

    const roomResult = await query(
      `INSERT INTO chat_rooms (property_id, room_type, subject, status, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [property_id || null, room_type || 'general', subject || null, 'active', req.user!.id]
    );

    const room = roomResult.rows[0];

    // Add creator as participant
    await query(
      `INSERT INTO chat_room_participants (chat_room_id, user_id)
       VALUES ($1, $2)`,
      [room.id, req.user!.id]
    );

    // Add other participants
    if (participant_ids && Array.isArray(participant_ids)) {
      for (const userId of participant_ids) {
        if (userId !== req.user!.id) {
          await query(
            `INSERT INTO chat_room_participants (chat_room_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [room.id, userId]
          );
        }
      }
    }

    res.status(201).json(room);
  } catch (err) {
    console.error('Create chat room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update chat room
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { subject, room_type, status } = req.body;

    const result = await query(
      `UPDATE chat_rooms
       SET subject = COALESCE($1, subject),
           room_type = COALESCE($2, room_type),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [subject, room_type, status, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Chat room not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update chat room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete chat room
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM chat_rooms WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Chat room not found' });
      return;
    }

    res.json({ message: 'Chat room deleted successfully' });
  } catch (err) {
    console.error('Delete chat room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/messages - list messages in a room
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);

    const result = await query(
      `SELECT cm.*, u.first_name, u.last_name, u.email
       FROM chat_messages cm
       JOIN app_users u ON u.id = cm.sender_id
       WHERE cm.chat_room_id = $1
       ORDER BY cm.created_at ASC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List chat messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/messages - send a message in a room
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { message_body, message_type, attachment_document_id } = req.body;

    if (!message_body) {
      res.status(400).json({ error: 'message_body is required' });
      return;
    }

    // Verify user is a participant
    const participant = await query(
      'SELECT id FROM chat_room_participants WHERE chat_room_id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );

    if (participant.rows.length === 0) {
      res.status(403).json({ error: 'You are not a participant in this room' });
      return;
    }

    const result = await query(
      `INSERT INTO chat_messages (chat_room_id, sender_id, message_body, message_type, attachment_document_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, req.user!.id, message_body, message_type || 'text', attachment_document_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Send chat message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
