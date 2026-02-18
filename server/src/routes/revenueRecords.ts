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
      SELECT rr.*, p.title AS property_title
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
    sql += ` ORDER BY rr.created_at DESC LIMIT $${params.length}`;
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
      `SELECT rr.*, p.title AS property_title
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
      property_id, record_type, state_code, district, taluk,
      village, survey_number, sub_division, extent_acres,
      extent_hectares, land_classification, current_holder_name,
      cultivation_details, pattadar_passbook_number,
      last_verified_on, document_id, notes,
    } = req.body;

    if (!property_id || !record_type) {
      res.status(400).json({ error: 'property_id and record_type are required' });
      return;
    }

    const result = await query(
      `INSERT INTO revenue_records (property_id, record_type, state_code, district, taluk, village, survey_number, sub_division, extent_acres, extent_hectares, land_classification, current_holder_name, cultivation_details, pattadar_passbook_number, last_verified_on, document_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        property_id, record_type, state_code || null, district || null,
        taluk || null, village || null, survey_number || null,
        sub_division || null, extent_acres || null, extent_hectares || null,
        land_classification || null, current_holder_name || null,
        cultivation_details || null, pattadar_passbook_number || null,
        last_verified_on || null, document_id || null, notes || null,
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
      record_type, state_code, district, taluk, village,
      survey_number, sub_division, extent_acres, extent_hectares,
      land_classification, current_holder_name, cultivation_details,
      pattadar_passbook_number, last_verified_on, document_id, notes,
    } = req.body;

    const result = await query(
      `UPDATE revenue_records
       SET record_type = COALESCE($1, record_type),
           state_code = COALESCE($2, state_code),
           district = COALESCE($3, district),
           taluk = COALESCE($4, taluk),
           village = COALESCE($5, village),
           survey_number = COALESCE($6, survey_number),
           sub_division = COALESCE($7, sub_division),
           extent_acres = COALESCE($8, extent_acres),
           extent_hectares = COALESCE($9, extent_hectares),
           land_classification = COALESCE($10, land_classification),
           current_holder_name = COALESCE($11, current_holder_name),
           cultivation_details = COALESCE($12, cultivation_details),
           pattadar_passbook_number = COALESCE($13, pattadar_passbook_number),
           last_verified_on = COALESCE($14, last_verified_on),
           document_id = COALESCE($15, document_id),
           notes = COALESCE($16, notes),
           updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        record_type, state_code, district, taluk, village,
        survey_number, sub_division, extent_acres, extent_hectares,
        land_classification, current_holder_name, cultivation_details,
        pattadar_passbook_number, last_verified_on, document_id, notes,
        req.params.id,
      ]
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
