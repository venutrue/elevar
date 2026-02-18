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
      SELECT i.*, p.name AS property_name,
             u.first_name AS inspector_first_name, u.last_name AS inspector_last_name
      FROM inspections i
      JOIN properties p ON p.id = i.property_id
      LEFT JOIN app_users u ON u.id = i.inspector_user_id
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
    sql += ` ORDER BY i.scheduled_date DESC LIMIT $${params.length}`;
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
      `SELECT i.*, p.name AS property_name,
              u.first_name AS inspector_first_name, u.last_name AS inspector_last_name
       FROM inspections i
       JOIN properties p ON p.id = i.property_id
       LEFT JOIN app_users u ON u.id = i.inspector_user_id
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
      property_id, inspection_type, scheduled_date, status,
      inspector_user_id, notes, findings,
    } = req.body;

    if (!property_id || !inspection_type || !scheduled_date) {
      res.status(400).json({ error: 'property_id, inspection_type, and scheduled_date are required' });
      return;
    }

    const result = await query(
      `INSERT INTO inspections (property_id, inspection_type, scheduled_date, status, inspector_user_id, notes, findings, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        property_id, inspection_type, scheduled_date, status || 'scheduled',
        inspector_user_id || null, notes || null, findings || null, req.user!.id,
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
      inspection_type, scheduled_date, completed_date, status,
      inspector_user_id, notes, findings, rating,
    } = req.body;

    const result = await query(
      `UPDATE inspections
       SET inspection_type = COALESCE($1, inspection_type),
           scheduled_date = COALESCE($2, scheduled_date),
           completed_date = COALESCE($3, completed_date),
           status = COALESCE($4, status),
           inspector_user_id = COALESCE($5, inspector_user_id),
           notes = COALESCE($6, notes),
           findings = COALESCE($7, findings),
           rating = COALESCE($8, rating),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [inspection_type, scheduled_date, completed_date, status, inspector_user_id, notes, findings, rating, req.params.id]
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
    const { file_url, file_type, caption, room, metadata } = req.body;

    if (!file_url) {
      res.status(400).json({ error: 'file_url is required' });
      return;
    }

    const result = await query(
      `INSERT INTO inspection_media (inspection_id, file_url, file_type, caption, room, metadata, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.id, file_url, file_type || 'image', caption || null, room || null, metadata ? JSON.stringify(metadata) : null, req.user!.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add inspection media error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
