import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list support tickets
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, status, type } = req.query;

    let sql = `
      SELECT st.*, p.title AS property_title,
             u.first_name AS opener_first_name, u.last_name AS opener_last_name
      FROM support_tickets st
      LEFT JOIN properties p ON p.id = st.property_id
      LEFT JOIN app_users u ON u.id = st.opened_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND st.property_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND st.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND st.ticket_type = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY st.created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset,
    });
  } catch (err) {
    console.error('List support tickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get support ticket by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT st.*, p.title AS property_title,
              u.first_name AS opener_first_name, u.last_name AS opener_last_name
       FROM support_tickets st
       LEFT JOIN properties p ON p.id = st.property_id
       LEFT JOIN app_users u ON u.id = st.opened_by
       WHERE st.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Support ticket not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get support ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create support ticket
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, ticket_type, subject, description,
      priority, status, assigned_to,
    } = req.body;

    if (!subject || !ticket_type) {
      res.status(400).json({ error: 'subject and ticket_type are required' });
      return;
    }

    const result = await query(
      `INSERT INTO support_tickets (property_id, ticket_type, subject, description, priority, status, assigned_to, opened_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        property_id || null, ticket_type, subject, description || null,
        priority || 'medium', status || 'open', assigned_to || null, req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create support ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update support ticket
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      ticket_type, subject, description, priority,
      status, assigned_to, resolved_at,
    } = req.body;

    const result = await query(
      `UPDATE support_tickets
       SET ticket_type = COALESCE($1, ticket_type),
           subject = COALESCE($2, subject),
           description = COALESCE($3, description),
           priority = COALESCE($4, priority),
           status = COALESCE($5, status),
           assigned_to = COALESCE($6, assigned_to),
           resolved_at = COALESCE($7, resolved_at),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [ticket_type, subject, description, priority, status, assigned_to, resolved_at, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Support ticket not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update support ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete support ticket
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM support_tickets WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Support ticket not found' });
      return;
    }

    res.json({ message: 'Support ticket deleted successfully' });
  } catch (err) {
    console.error('Delete support ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/messages - list messages for a ticket
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);

    const result = await query(
      `SELECT tm.*, u.first_name, u.last_name, u.email
       FROM ticket_messages tm
       LEFT JOIN app_users u ON u.id = tm.sender_id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List ticket messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/messages - send a message on a ticket
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { message_body, is_internal } = req.body;

    if (!message_body) {
      res.status(400).json({ error: 'message_body is required' });
      return;
    }

    const result = await query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, message_body, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, req.user!.id, message_body, is_internal || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create ticket message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
