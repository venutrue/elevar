import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list powers of attorney
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, status } = req.query;

    let sql = `
      SELECT poa.*, p.title AS property_title,
             owner.first_name AS owner_first_name, owner.last_name AS owner_last_name,
             attorney.first_name AS attorney_first_name, attorney.last_name AS attorney_last_name
      FROM powers_of_attorney poa
      LEFT JOIN properties p ON p.id = poa.property_id
      LEFT JOIN app_users owner ON owner.id = poa.owner_id
      LEFT JOIN app_users attorney ON attorney.id = poa.attorney_holder_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND poa.property_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND poa.status = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY poa.created_at DESC LIMIT $${params.length}`;
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
    console.error('List POAs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get POA by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT poa.*, p.title AS property_title,
              owner.first_name AS owner_first_name, owner.last_name AS owner_last_name,
              attorney.first_name AS attorney_first_name, attorney.last_name AS attorney_last_name
       FROM powers_of_attorney poa
       LEFT JOIN properties p ON p.id = poa.property_id
       LEFT JOIN app_users owner ON owner.id = poa.owner_id
       LEFT JOIN app_users attorney ON attorney.id = poa.attorney_holder_id
       WHERE poa.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Power of attorney not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get POA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create POA
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, owner_id, attorney_holder_id, poa_scope,
      registration_number, status, issued_on, valid_until,
      revoked_on, revocation_reason,
    } = req.body;

    if (!owner_id || !attorney_holder_id || !poa_scope) {
      res.status(400).json({ error: 'owner_id, attorney_holder_id, and poa_scope are required' });
      return;
    }

    const result = await query(
      `INSERT INTO powers_of_attorney (property_id, owner_id, attorney_holder_id, poa_scope, registration_number, status, issued_on, valid_until, revoked_on, revocation_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        property_id || null, owner_id, attorney_holder_id, poa_scope,
        registration_number || null, status || 'draft',
        issued_on || null, valid_until || null,
        revoked_on || null, revocation_reason || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create POA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update POA
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      poa_scope, registration_number, status,
      issued_on, valid_until, revoked_on, revocation_reason,
    } = req.body;

    const result = await query(
      `UPDATE powers_of_attorney
       SET poa_scope = COALESCE($1, poa_scope),
           registration_number = COALESCE($2, registration_number),
           status = COALESCE($3, status),
           issued_on = COALESCE($4, issued_on),
           valid_until = COALESCE($5, valid_until),
           revoked_on = COALESCE($6, revoked_on),
           revocation_reason = COALESCE($7, revocation_reason),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [poa_scope, registration_number, status, issued_on, valid_until, revoked_on, revocation_reason, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Power of attorney not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update POA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete POA
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM powers_of_attorney WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Power of attorney not found' });
      return;
    }

    res.json({ message: 'Power of attorney deleted successfully' });
  } catch (err) {
    console.error('Delete POA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
