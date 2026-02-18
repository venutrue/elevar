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
      SELECT sh.*, p.title AS property_title
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
      `SELECT sh.*, p.title AS property_title
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
      property_id, subscription_id, handled_by, handover_type,
      status, target_completion_date, notes, cancellation_reason,
    } = req.body;

    if (!property_id || !handover_type) {
      res.status(400).json({ error: 'property_id and handover_type are required' });
      return;
    }

    const result = await query(
      `INSERT INTO service_handovers (property_id, subscription_id, initiated_by, handled_by, handover_type, status, target_completion_date, notes, cancellation_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        property_id, subscription_id || null, req.user!.id,
        handled_by || null, handover_type, status || 'initiated',
        target_completion_date || null, notes || null,
        cancellation_reason || null,
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
      status, handled_by, target_completion_date,
      completed_at, notes, cancellation_reason,
    } = req.body;

    const result = await query(
      `UPDATE service_handovers
       SET status = COALESCE($1, status),
           handled_by = COALESCE($2, handled_by),
           target_completion_date = COALESCE($3, target_completion_date),
           completed_at = COALESCE($4, completed_at),
           notes = COALESCE($5, notes),
           cancellation_reason = COALESCE($6, cancellation_reason),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [status, handled_by, target_completion_date, completed_at, notes, cancellation_reason, req.params.id]
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
    const { item_type, description, document_id, status, completed_at, completed_by, notes } = req.body;

    if (!item_type) {
      res.status(400).json({ error: 'item_type is required' });
      return;
    }

    const result = await query(
      `INSERT INTO handover_items (handover_id, item_type, description, document_id, status, completed_at, completed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.params.id, item_type, description || null,
        document_id || null, status || 'pending',
        completed_at || null, completed_by || null, notes || null,
      ]
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
    const { item_type, description, document_id, status, completed_at, completed_by, notes } = req.body;

    const result = await query(
      `UPDATE handover_items
       SET item_type = COALESCE($1, item_type),
           description = COALESCE($2, description),
           document_id = COALESCE($3, document_id),
           status = COALESCE($4, status),
           completed_at = COALESCE($5, completed_at),
           completed_by = COALESCE($6, completed_by),
           notes = COALESCE($7, notes),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [item_type, description, document_id, status, completed_at, completed_by, notes, req.params.itemId]
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
