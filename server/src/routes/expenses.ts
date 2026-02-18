import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET /summary - expense totals grouped by category (defined before /:id)
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { property_id } = req.query;

    if (!property_id) {
      res.status(400).json({ error: 'property_id query parameter is required' });
      return;
    }

    const result = await query(
      `SELECT expense_category,
              COUNT(*) AS count,
              SUM(amount) AS total_amount,
              SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) AS paid_amount,
              SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) AS pending_amount
       FROM property_expenses
       WHERE property_id = $1
       GROUP BY expense_category
       ORDER BY total_amount DESC`,
      [property_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Expense summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list expenses
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, expense_category, payment_status } = req.query;

    let sql = `
      SELECT pe.*, p.title AS property_title
      FROM property_expenses pe
      LEFT JOIN properties p ON p.id = pe.property_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND pe.property_id = $${params.length}`;
    }
    if (expense_category) {
      params.push(expense_category);
      sql += ` AND pe.expense_category = $${params.length}`;
    }
    if (payment_status) {
      params.push(payment_status);
      sql += ` AND pe.payment_status = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY pe.expense_date DESC LIMIT $${params.length}`;
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
    console.error('List expenses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get expense by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT pe.*, p.title AS property_title
       FROM property_expenses pe
       LEFT JOIN properties p ON p.id = pe.property_id
       WHERE pe.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create expense
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, expense_category, description, amount, currency_code,
      expense_date, due_date, payment_status, vendor_name,
      receipt_document_id, reference_number, is_recurring,
      recurrence_interval, notes,
    } = req.body;

    if (!property_id || !amount || !expense_category) {
      res.status(400).json({ error: 'property_id, expense_category, and amount are required' });
      return;
    }

    const result = await query(
      `INSERT INTO property_expenses (property_id, recorded_by, expense_category, description, amount, currency_code, expense_date, due_date, payment_status, vendor_name, receipt_document_id, reference_number, is_recurring, recurrence_interval, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        property_id, req.user!.id, expense_category, description || null, amount,
        currency_code || 'INR',
        expense_date || new Date().toISOString().split('T')[0],
        due_date || null, payment_status || 'pending',
        vendor_name || null, receipt_document_id || null,
        reference_number || null, is_recurring || false,
        recurrence_interval || null, notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update expense
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      expense_category, description, amount, currency_code,
      expense_date, due_date, payment_status, vendor_name,
      receipt_document_id, reference_number, is_recurring,
      recurrence_interval, notes,
    } = req.body;

    const result = await query(
      `UPDATE property_expenses
       SET expense_category = COALESCE($1, expense_category),
           description = COALESCE($2, description),
           amount = COALESCE($3, amount),
           currency_code = COALESCE($4, currency_code),
           expense_date = COALESCE($5, expense_date),
           due_date = COALESCE($6, due_date),
           payment_status = COALESCE($7, payment_status),
           vendor_name = COALESCE($8, vendor_name),
           receipt_document_id = COALESCE($9, receipt_document_id),
           reference_number = COALESCE($10, reference_number),
           is_recurring = COALESCE($11, is_recurring),
           recurrence_interval = COALESCE($12, recurrence_interval),
           notes = COALESCE($13, notes),
           updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        expense_category, description, amount, currency_code,
        expense_date, due_date, payment_status, vendor_name,
        receipt_document_id, reference_number, is_recurring,
        recurrence_interval, notes, req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete expense
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM property_expenses WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
