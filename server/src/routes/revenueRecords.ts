import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list revenue records
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, record_type, state_code } = req.query;

    let sql = `
      SELECT rr.*, p.name AS property_name
      FROM revenue_records rr
      LEFT JOIN properties p ON p.id = rr.property_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND rr.property_id = $${params.length}`;
    }
    if (record_type) {
      params.push(record_type);
      sql += ` AND rr.record_type = $${params.length}`;
    }
    if (state_code) {
      params.push(state_code);
      sql += ` AND rr.state_code = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY rr.record_date DESC LIMIT $${params.length}`;
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
    console.error('List revenue records error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get revenue record by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT rr.*, p.name AS property_name
       FROM revenue_records rr
       LEFT JOIN properties p ON p.id = rr.property_id
       WHERE rr.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Revenue record not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get revenue record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create revenue record
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, record_type, description, amount,
      record_date, state_code, reference_number, metadata,
    } = req.body;

    if (!property_id || !record_type || !amount) {
      res.status(400).json({ error: 'property_id, record_type, and amount are required' });
      return;
    }

    const result = await query(
      `INSERT INTO revenue_records (property_id, record_type, description, amount, record_date, state_code, reference_number, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        property_id, record_type, description || null, amount,
        record_date || new Date().toISOString().split('T')[0],
        state_code || null, reference_number || null,
        metadata ? JSON.stringify(metadata) : null, req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create revenue record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update revenue record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      record_type, description, amount, record_date,
      state_code, reference_number, metadata,
    } = req.body;

    const result = await query(
      `UPDATE revenue_records
       SET record_type = COALESCE($1, record_type),
           description = COALESCE($2, description),
           amount = COALESCE($3, amount),
           record_date = COALESCE($4, record_date),
           state_code = COALESCE($5, state_code),
           reference_number = COALESCE($6, reference_number),
           metadata = COALESCE($7, metadata),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [record_type, description, amount, record_date, state_code, reference_number, metadata ? JSON.stringify(metadata) : null, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Revenue record not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update revenue record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete revenue record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM revenue_records WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Revenue record not found' });
      return;
    }

    res.json({ message: 'Revenue record deleted successfully' });
  } catch (err) {
    console.error('Delete revenue record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
