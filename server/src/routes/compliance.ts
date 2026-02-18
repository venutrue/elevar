import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET /audit-cycles - list audit cycles (defined before /:id to avoid route conflict)
router.get('/audit-cycles', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);

    const result = await query(
      `SELECT * FROM audit_cycles
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List audit cycles error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /audit-cycles - create audit cycle
router.post('/audit-cycles', async (req: Request, res: Response) => {
  try {
    const {
      property_id, audit_year, audit_label, property_type_checklist,
      status, scheduled_start, scheduled_end, assigned_to, notes,
    } = req.body;

    if (!property_id || !audit_year || !audit_label) {
      res.status(400).json({ error: 'property_id, audit_year, and audit_label are required' });
      return;
    }

    const result = await query(
      `INSERT INTO audit_cycles (property_id, audit_year, audit_label, property_type_checklist, status, scheduled_start, scheduled_end, assigned_to, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        property_id, audit_year, audit_label, property_type_checklist || null,
        status || 'scheduled', scheduled_start || null, scheduled_end || null,
        assigned_to || null, notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create audit cycle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /audit-cycles/:id - get audit cycle by id
router.get('/audit-cycles/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM audit_cycles WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Audit cycle not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get audit cycle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list compliance checks
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, status, check_type } = req.query;

    let sql = `
      SELECT cc.*, p.title AS property_title
      FROM compliance_checks cc
      LEFT JOIN properties p ON p.id = cc.property_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND cc.property_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND cc.status = $${params.length}`;
    }
    if (check_type) {
      params.push(check_type);
      sql += ` AND cc.check_type = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY cc.due_date ASC LIMIT $${params.length}`;
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
    console.error('List compliance checks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get compliance check by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT cc.*, p.title AS property_title
       FROM compliance_checks cc
       LEFT JOIN properties p ON p.id = cc.property_id
       WHERE cc.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Compliance check not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get compliance check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create compliance check
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, check_type, status,
      due_date, completed_at, assigned_to, notes, audit_cycle_id,
    } = req.body;

    if (!property_id || !check_type) {
      res.status(400).json({ error: 'property_id and check_type are required' });
      return;
    }

    const result = await query(
      `INSERT INTO compliance_checks (property_id, check_type, status, due_date, completed_at, assigned_to, notes, audit_cycle_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        property_id, check_type, status || 'pending',
        due_date || null, completed_at || null,
        assigned_to || null, notes || null, audit_cycle_id || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create compliance check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update compliance check
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      check_type, status, due_date,
      completed_at, assigned_to, notes, audit_cycle_id,
    } = req.body;

    const result = await query(
      `UPDATE compliance_checks
       SET check_type = COALESCE($1, check_type),
           status = COALESCE($2, status),
           due_date = COALESCE($3, due_date),
           completed_at = COALESCE($4, completed_at),
           assigned_to = COALESCE($5, assigned_to),
           notes = COALESCE($6, notes),
           audit_cycle_id = COALESCE($7, audit_cycle_id),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [check_type, status, due_date, completed_at, assigned_to, notes, audit_cycle_id, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Compliance check not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update compliance check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete compliance check
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM compliance_checks WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Compliance check not found' });
      return;
    }

    res.json({ message: 'Compliance check deleted successfully' });
  } catch (err) {
    console.error('Delete compliance check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
