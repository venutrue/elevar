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
      SELECT poa.*, p.name AS property_name,
             grantor.first_name AS grantor_first_name, grantor.last_name AS grantor_last_name,
             grantee.first_name AS grantee_first_name, grantee.last_name AS grantee_last_name
      FROM powers_of_attorney poa
      LEFT JOIN properties p ON p.id = poa.property_id
      LEFT JOIN app_users grantor ON grantor.id = poa.grantor_user_id
      LEFT JOIN app_users grantee ON grantee.id = poa.grantee_user_id
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
      `SELECT poa.*, p.name AS property_name,
              grantor.first_name AS grantor_first_name, grantor.last_name AS grantor_last_name,
              grantee.first_name AS grantee_first_name, grantee.last_name AS grantee_last_name
       FROM powers_of_attorney poa
       LEFT JOIN properties p ON p.id = poa.property_id
       LEFT JOIN app_users grantor ON grantor.id = poa.grantor_user_id
       LEFT JOIN app_users grantee ON grantee.id = poa.grantee_user_id
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
      property_id, grantor_user_id, grantee_user_id, poa_type,
      title, description, status, start_date, end_date,
      notary_reference, document_url,
    } = req.body;

    if (!grantor_user_id || !grantee_user_id || !poa_type || !title) {
      res.status(400).json({ error: 'grantor_user_id, grantee_user_id, poa_type, and title are required' });
      return;
    }

    const result = await query(
      `INSERT INTO powers_of_attorney (property_id, grantor_user_id, grantee_user_id, poa_type, title, description, status, start_date, end_date, notary_reference, document_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        property_id || null, grantor_user_id, grantee_user_id, poa_type,
        title, description || null, status || 'draft',
        start_date || null, end_date || null,
        notary_reference || null, document_url || null, req.user!.id,
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
      poa_type, title, description, status,
      start_date, end_date, notary_reference, document_url,
    } = req.body;

    const result = await query(
      `UPDATE powers_of_attorney
       SET poa_type = COALESCE($1, poa_type),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           status = COALESCE($4, status),
           start_date = COALESCE($5, start_date),
           end_date = COALESCE($6, end_date),
           notary_reference = COALESCE($7, notary_reference),
           document_url = COALESCE($8, document_url),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [poa_type, title, description, status, start_date, end_date, notary_reference, document_url, req.params.id]
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
