import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list service handovers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, status } = req.query;

    let sql = `
      SELECT sh.*, p.name AS property_name
      FROM service_handovers sh
      LEFT JOIN properties p ON p.id = sh.property_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND sh.property_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND sh.status = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY sh.created_at DESC LIMIT $${params.length}`;
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
    console.error('List handovers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get handover by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT sh.*, p.name AS property_name
       FROM service_handovers sh
       LEFT JOIN properties p ON p.id = sh.property_id
       WHERE sh.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Handover not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get handover error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create handover
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, title, description, status,
      handover_date, from_party, to_party,
    } = req.body;

    if (!property_id || !title) {
      res.status(400).json({ error: 'property_id and title are required' });
      return;
    }

    const result = await query(
      `INSERT INTO service_handovers (property_id, title, description, status, handover_date, from_party, to_party, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        property_id, title, description || null, status || 'pending',
        handover_date || null, from_party || null, to_party || null, req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create handover error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update handover
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      title, description, status, handover_date,
      from_party, to_party, completed_date, notes,
    } = req.body;

    const result = await query(
      `UPDATE service_handovers
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           handover_date = COALESCE($4, handover_date),
           from_party = COALESCE($5, from_party),
           to_party = COALESCE($6, to_party),
           completed_date = COALESCE($7, completed_date),
           notes = COALESCE($8, notes),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [title, description, status, handover_date, from_party, to_party, completed_date, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Handover not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update handover error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete handover
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM service_handovers WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Handover not found' });
      return;
    }

    res.json({ message: 'Handover deleted successfully' });
  } catch (err) {
    console.error('Delete handover error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/items - list items for a handover
router.get('/:id/items', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM handover_items
       WHERE handover_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List handover items error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/items - add item to handover
router.post('/:id/items', async (req: Request, res: Response) => {
  try {
    const { item_name, description, condition, quantity, notes } = req.body;

    if (!item_name) {
      res.status(400).json({ error: 'item_name is required' });
      return;
    }

    const result = await query(
      `INSERT INTO handover_items (handover_id, item_name, description, condition, quantity, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, item_name, description || null, condition || null, quantity || 1, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add handover item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /items/:itemId - update handover item
router.put('/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { item_name, description, condition, quantity, notes, status } = req.body;

    const result = await query(
      `UPDATE handover_items
       SET item_name = COALESCE($1, item_name),
           description = COALESCE($2, description),
           condition = COALESCE($3, condition),
           quantity = COALESCE($4, quantity),
           notes = COALESCE($5, notes),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [item_name, description, condition, quantity, notes, status, req.params.itemId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Handover item not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update handover item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
