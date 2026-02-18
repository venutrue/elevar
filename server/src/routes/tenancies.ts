import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list tenancies with tenant and property info
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, agreement_status } = req.query;

    let sql = `
      SELECT t.*,
             p.title AS property_name,
             tn.full_name AS tenant_name, tn.email AS tenant_email, tn.phone AS tenant_phone
      FROM tenancies t
      JOIN properties p ON p.id = t.property_id
      JOIN tenants tn ON tn.id = t.tenant_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND t.property_id = $${params.length}`;
    }
    if (agreement_status) {
      params.push(agreement_status);
      sql += ` AND t.agreement_status = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY t.created_at DESC LIMIT $${params.length}`;
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
    console.error('List tenancies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get tenancy by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT t.*,
              p.title AS property_name,
              tn.full_name AS tenant_name, tn.email AS tenant_email, tn.phone AS tenant_phone
       FROM tenancies t
       JOIN properties p ON p.id = t.property_id
       JOIN tenants tn ON tn.id = t.tenant_id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tenancy not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get tenancy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create tenancy
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, tenant_id, lease_start, lease_end,
      monthly_rent, security_deposit, payment_day_of_month, agreement_status,
    } = req.body;

    if (!property_id || !tenant_id || !lease_start || !monthly_rent) {
      res.status(400).json({ error: 'property_id, tenant_id, lease_start, and monthly_rent are required' });
      return;
    }

    const result = await query(
      `INSERT INTO tenancies (property_id, tenant_id, lease_start, lease_end, monthly_rent, security_deposit, payment_day_of_month, agreement_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        property_id, tenant_id, lease_start, lease_end || null,
        monthly_rent, security_deposit || null, payment_day_of_month || null, agreement_status || 'active',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create tenancy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update tenancy
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { lease_start, lease_end, monthly_rent, security_deposit, payment_day_of_month, agreement_status } = req.body;

    const result = await query(
      `UPDATE tenancies
       SET lease_start = COALESCE($1, lease_start),
           lease_end = COALESCE($2, lease_end),
           monthly_rent = COALESCE($3, monthly_rent),
           security_deposit = COALESCE($4, security_deposit),
           payment_day_of_month = COALESCE($5, payment_day_of_month),
           agreement_status = COALESCE($6, agreement_status),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [lease_start, lease_end, monthly_rent, security_deposit, payment_day_of_month, agreement_status, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tenancy not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update tenancy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete tenancy
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM tenancies WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tenancy not found' });
      return;
    }

    res.json({ message: 'Tenancy deleted successfully' });
  } catch (err) {
    console.error('Delete tenancy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/payments - list rent payments for a tenancy
router.get('/:id/payments', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);

    const result = await query(
      `SELECT * FROM rent_payments
       WHERE tenancy_id = $1
       ORDER BY due_date DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List rent payments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/payments - create rent payment
router.post('/:id/payments', async (req: Request, res: Response) => {
  try {
    const { amount_due, due_date, paid_on, amount_paid, payment_status, reference_number } = req.body;

    if (!amount_due || !due_date) {
      res.status(400).json({ error: 'amount_due and due_date are required' });
      return;
    }

    const result = await query(
      `INSERT INTO rent_payments (tenancy_id, amount_due, due_date, amount_paid, paid_on, payment_status, reference_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.id, amount_due, due_date, amount_paid || 0, paid_on || null, payment_status || 'due', reference_number || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create rent payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /payments/:paymentId - update rent payment
router.put('/payments/:paymentId', async (req: Request, res: Response) => {
  try {
    const { amount_due, due_date, amount_paid, paid_on, payment_status, reference_number } = req.body;

    const result = await query(
      `UPDATE rent_payments
       SET amount_due = COALESCE($1, amount_due),
           due_date = COALESCE($2, due_date),
           amount_paid = COALESCE($3, amount_paid),
           paid_on = COALESCE($4, paid_on),
           payment_status = COALESCE($5, payment_status),
           reference_number = COALESCE($6, reference_number),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [amount_due, due_date, amount_paid, paid_on, payment_status, reference_number, req.params.paymentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update rent payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
