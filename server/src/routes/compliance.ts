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
    const { name, start_date, end_date, status, description } = req.body;

    if (!name || !start_date || !end_date) {
      res.status(400).json({ error: 'name, start_date, and end_date are required' });
      return;
    }

    const result = await query(
      `INSERT INTO audit_cycles (name, start_date, end_date, status, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, start_date, end_date, status || 'planned', description || null, req.user!.id]
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
      SELECT cc.*, p.name AS property_name
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
      `SELECT cc.*, p.name AS property_name
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
      property_id, check_type, title, description, status,
      due_date, completed_date, assigned_to, audit_cycle_id,
    } = req.body;

    if (!property_id || !check_type || !title) {
      res.status(400).json({ error: 'property_id, check_type, and title are required' });
      return;
    }

    const result = await query(
      `INSERT INTO compliance_checks (property_id, check_type, title, description, status, due_date, completed_date, assigned_to, audit_cycle_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        property_id, check_type, title, description || null,
        status || 'pending', due_date || null, completed_date || null,
        assigned_to || null, audit_cycle_id || null, req.user!.id,
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
      check_type, title, description, status,
      due_date, completed_date, assigned_to, findings, audit_cycle_id,
    } = req.body;

    const result = await query(
      `UPDATE compliance_checks
       SET check_type = COALESCE($1, check_type),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           status = COALESCE($4, status),
           due_date = COALESCE($5, due_date),
           completed_date = COALESCE($6, completed_date),
           assigned_to = COALESCE($7, assigned_to),
           findings = COALESCE($8, findings),
           audit_cycle_id = COALESCE($9, audit_cycle_id),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [check_type, title, description, status, due_date, completed_date, assigned_to, findings, audit_cycle_id, req.params.id]
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
