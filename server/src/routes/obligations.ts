import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list property obligations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, type } = req.query;

    let sql = `
      SELECT po.*, p.name AS property_name
      FROM property_obligations po
      LEFT JOIN properties p ON p.id = po.property_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND po.property_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND po.obligation_type = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY po.due_date ASC LIMIT $${params.length}`;
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
    console.error('List obligations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get obligation by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT po.*, p.name AS property_name
       FROM property_obligations po
       LEFT JOIN properties p ON p.id = po.property_id
       WHERE po.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Obligation not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get obligation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create obligation
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, obligation_type, title, description,
      amount, due_date, recurring, frequency, status,
    } = req.body;

    if (!property_id || !obligation_type || !title) {
      res.status(400).json({ error: 'property_id, obligation_type, and title are required' });
      return;
    }

    const result = await query(
      `INSERT INTO property_obligations (property_id, obligation_type, title, description, amount, due_date, recurring, frequency, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        property_id, obligation_type, title, description || null,
        amount || null, due_date || null, recurring || false,
        frequency || null, status || 'active', req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create obligation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update obligation
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      obligation_type, title, description, amount,
      due_date, recurring, frequency, status,
    } = req.body;

    const result = await query(
      `UPDATE property_obligations
       SET obligation_type = COALESCE($1, obligation_type),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           amount = COALESCE($4, amount),
           due_date = COALESCE($5, due_date),
           recurring = COALESCE($6, recurring),
           frequency = COALESCE($7, frequency),
           status = COALESCE($8, status),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [obligation_type, title, description, amount, due_date, recurring, frequency, status, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Obligation not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update obligation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete obligation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM property_obligations WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Obligation not found' });
      return;
    }

    res.json({ message: 'Obligation deleted successfully' });
  } catch (err) {
    console.error('Delete obligation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/payments - list payments for an obligation
router.get('/:id/payments', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);

    const result = await query(
      `SELECT * FROM obligation_payments
       WHERE obligation_id = $1
       ORDER BY payment_date DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List obligation payments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/payments - create obligation payment
router.post('/:id/payments', async (req: Request, res: Response) => {
  try {
    const { amount, payment_date, payment_method, reference_number, notes } = req.body;

    if (!amount) {
      res.status(400).json({ error: 'amount is required' });
      return;
    }

    const result = await query(
      `INSERT INTO obligation_payments (obligation_id, amount, payment_date, payment_method, reference_number, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.params.id, amount,
        payment_date || new Date().toISOString().split('T')[0],
        payment_method || null, reference_number || null,
        notes || null, req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create obligation payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
