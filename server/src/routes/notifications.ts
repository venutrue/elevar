import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET /unread-count - count of unread notifications (defined before /:id)
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user!.id]
    );

    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /read-all - mark all notifications as read
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [req.user!.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list notifications for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { is_read } = req.query;

    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [req.user!.id];

    if (is_read !== undefined) {
      params.push(is_read === 'true');
      sql += ` AND is_read = $${params.length}`;
    }

    const countResult = await query(
      sql.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
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
    console.error('List notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id/read - mark a notification as read
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
