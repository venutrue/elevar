import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list legal cases
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, status, case_type } = req.query;

    let sql = `
      SELECT lc.*, p.title AS property_name
      FROM legal_cases lc
      LEFT JOIN properties p ON p.id = lc.property_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND lc.property_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND lc.status = $${params.length}`;
    }
    if (case_type) {
      params.push(case_type);
      sql += ` AND lc.case_type = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY lc.created_at DESC LIMIT $${params.length}`;
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
    console.error('List legal cases error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get legal case by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT lc.*, p.title AS property_name
       FROM legal_cases lc
       LEFT JOIN properties p ON p.id = lc.property_id
       WHERE lc.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Legal case not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get legal case error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create legal case
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, case_type, summary, details, status,
      priority, assigned_to, case_number,
    } = req.body;

    if (!summary || !case_type) {
      res.status(400).json({ error: 'summary and case_type are required' });
      return;
    }

    const result = await query(
      `INSERT INTO legal_cases (property_id, case_type, summary, details, status, priority, assigned_to, case_number, opened_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        property_id || null, case_type, summary, details || null,
        status || 'open', priority || 'medium', assigned_to || null,
        case_number || null, req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create legal case error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update legal case
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      case_type, summary, details, status, priority,
      assigned_to, case_number, closed_at,
    } = req.body;

    const result = await query(
      `UPDATE legal_cases
       SET case_type = COALESCE($1, case_type),
           summary = COALESCE($2, summary),
           details = COALESCE($3, details),
           status = COALESCE($4, status),
           priority = COALESCE($5, priority),
           assigned_to = COALESCE($6, assigned_to),
           case_number = COALESCE($7, case_number),
           closed_at = COALESCE($8, closed_at),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        case_type, summary, details, status, priority,
        assigned_to, case_number, closed_at,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Legal case not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update legal case error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete legal case
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM legal_cases WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Legal case not found' });
      return;
    }

    res.json({ message: 'Legal case deleted successfully' });
  } catch (err) {
    console.error('Delete legal case error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/updates - list case updates
router.get('/:id/updates', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);

    const result = await query(
      `SELECT cu.*, u.first_name, u.last_name
       FROM legal_case_updates cu
       LEFT JOIN app_users u ON u.id = cu.author_id
       WHERE cu.legal_case_id = $1
       ORDER BY cu.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List case updates error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/updates - create case update
router.post('/:id/updates', async (req: Request, res: Response) => {
  try {
    const { update_type, content, is_visible_to_owner } = req.body;

    if (!content) {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    const result = await query(
      `INSERT INTO legal_case_updates (legal_case_id, update_type, content, is_visible_to_owner, author_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, update_type || 'note', content, is_visible_to_owner !== false, req.user!.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create case update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
