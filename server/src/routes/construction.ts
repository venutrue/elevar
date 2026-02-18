import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list construction projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, status } = req.query;

    let sql = `
      SELECT cp.*, p.title AS property_title
      FROM construction_projects cp
      LEFT JOIN properties p ON p.id = cp.property_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND cp.property_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND cp.status = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY cp.created_at DESC LIMIT $${params.length}`;
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
    console.error('List construction projects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get construction project by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT cp.*, p.title AS property_title
       FROM construction_projects cp
       LEFT JOIN properties p ON p.id = cp.property_id
       WHERE cp.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Construction project not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get construction project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create construction project
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, project_type, title, description, status,
      contractor_name, contractor_phone, estimated_budget, actual_spend,
      currency_code, planned_start, planned_end, actual_start, actual_end,
    } = req.body;

    if (!property_id || !title) {
      res.status(400).json({ error: 'property_id and title are required' });
      return;
    }

    const result = await query(
      `INSERT INTO construction_projects (property_id, managed_by, project_type, title, description, status, contractor_name, contractor_phone, estimated_budget, actual_spend, currency_code, planned_start, planned_end, actual_start, actual_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        property_id, req.user!.id, project_type || null, title,
        description || null, status || 'planned',
        contractor_name || null, contractor_phone || null,
        estimated_budget || null, actual_spend || null,
        currency_code || 'INR', planned_start || null,
        planned_end || null, actual_start || null, actual_end || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create construction project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update construction project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      project_type, title, description, status,
      contractor_name, contractor_phone, estimated_budget,
      actual_spend, currency_code, planned_start, planned_end,
      actual_start, actual_end,
    } = req.body;

    const result = await query(
      `UPDATE construction_projects
       SET project_type = COALESCE($1, project_type),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           status = COALESCE($4, status),
           contractor_name = COALESCE($5, contractor_name),
           contractor_phone = COALESCE($6, contractor_phone),
           estimated_budget = COALESCE($7, estimated_budget),
           actual_spend = COALESCE($8, actual_spend),
           currency_code = COALESCE($9, currency_code),
           planned_start = COALESCE($10, planned_start),
           planned_end = COALESCE($11, planned_end),
           actual_start = COALESCE($12, actual_start),
           actual_end = COALESCE($13, actual_end),
           updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        project_type, title, description, status,
        contractor_name, contractor_phone, estimated_budget,
        actual_spend, currency_code, planned_start, planned_end,
        actual_start, actual_end, req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Construction project not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update construction project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete construction project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM construction_projects WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Construction project not found' });
      return;
    }

    res.json({ message: 'Construction project deleted successfully' });
  } catch (err) {
    console.error('Delete construction project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/milestones - list milestones for a project
router.get('/:id/milestones', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM construction_milestones
       WHERE project_id = $1
       ORDER BY sequence_order ASC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List milestones error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/milestones - create milestone
router.post('/:id/milestones', async (req: Request, res: Response) => {
  try {
    const { title, description, sequence_order, due_date, status, completed_at } = req.body;

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const result = await query(
      `INSERT INTO construction_milestones (project_id, title, description, sequence_order, due_date, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.id, title, description || null, sequence_order || 0, due_date || null, status || 'pending', completed_at || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create milestone error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /milestones/:milestoneId - update milestone
router.put('/milestones/:milestoneId', async (req: Request, res: Response) => {
  try {
    const { title, description, sequence_order, due_date, status, completed_at } = req.body;

    const result = await query(
      `UPDATE construction_milestones
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           sequence_order = COALESCE($3, sequence_order),
           due_date = COALESCE($4, due_date),
           status = COALESCE($5, status),
           completed_at = COALESCE($6, completed_at),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, description, sequence_order, due_date, status, completed_at, req.params.milestoneId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update milestone error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
