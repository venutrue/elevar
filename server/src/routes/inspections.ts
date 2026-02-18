import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list inspections with property and inspector info
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, status, type } = req.query;

    let sql = `
      SELECT i.*, p.title AS property_name,
             u.first_name AS inspector_first_name, u.last_name AS inspector_last_name
      FROM inspections i
      JOIN properties p ON p.id = i.property_id
      LEFT JOIN app_users u ON u.id = i.inspector_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND i.property_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND i.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND i.inspection_type = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY i.scheduled_at DESC LIMIT $${params.length}`;
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
    console.error('List inspections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get inspection by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT i.*, p.title AS property_name,
              u.first_name AS inspector_first_name, u.last_name AS inspector_last_name
       FROM inspections i
       JOIN properties p ON p.id = i.property_id
       LEFT JOIN app_users u ON u.id = i.inspector_id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get inspection error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create inspection
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, inspection_type, scheduled_at, status,
      inspector_id, summary,
    } = req.body;

    if (!property_id || !inspection_type || !scheduled_at) {
      res.status(400).json({ error: 'property_id, inspection_type, and scheduled_at are required' });
      return;
    }

    const result = await query(
      `INSERT INTO inspections (property_id, inspection_type, scheduled_at, status, inspector_id, summary)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        property_id, inspection_type, scheduled_at, status || 'scheduled',
        inspector_id || null, summary || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create inspection error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update inspection
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      inspection_type, scheduled_at, completed_at, status,
      inspector_id, summary, risk_level,
    } = req.body;

    const result = await query(
      `UPDATE inspections
       SET inspection_type = COALESCE($1, inspection_type),
           scheduled_at = COALESCE($2, scheduled_at),
           completed_at = COALESCE($3, completed_at),
           status = COALESCE($4, status),
           inspector_id = COALESCE($5, inspector_id),
           summary = COALESCE($6, summary),
           risk_level = COALESCE($7, risk_level),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [inspection_type, scheduled_at, completed_at, status, inspector_id, summary, risk_level, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update inspection error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete inspection
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM inspections WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }

    res.json({ message: 'Inspection deleted successfully' });
  } catch (err) {
    console.error('Delete inspection error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/media - list media for an inspection
router.get('/:id/media', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM inspection_media
       WHERE inspection_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List inspection media error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/media - add media to an inspection
router.post('/:id/media', async (req: Request, res: Response) => {
  try {
    const { storage_key, media_type, caption, captured_at, latitude, longitude } = req.body;

    if (!storage_key) {
      res.status(400).json({ error: 'storage_key is required' });
      return;
    }

    const result = await query(
      `INSERT INTO inspection_media (inspection_id, storage_key, media_type, caption, captured_at, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.id, storage_key, media_type || 'photo', caption || null, captured_at || null, latitude || null, longitude || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add inspection media error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
