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
      SELECT cp.*, p.name AS property_name
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
      `SELECT cp.*, p.name AS property_name
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
      property_id, title, description, status, contractor,
      budget, start_date, expected_end_date, actual_end_date,
    } = req.body;

    if (!property_id || !title) {
      res.status(400).json({ error: 'property_id and title are required' });
      return;
    }

    const result = await query(
      `INSERT INTO construction_projects (property_id, title, description, status, contractor, budget, start_date, expected_end_date, actual_end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        property_id, title, description || null, status || 'planned',
        contractor || null, budget || null, start_date || null,
        expected_end_date || null, actual_end_date || null, req.user!.id,
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
      title, description, status, contractor, budget,
      start_date, expected_end_date, actual_end_date, progress_percentage,
    } = req.body;

    const result = await query(
      `UPDATE construction_projects
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           contractor = COALESCE($4, contractor),
           budget = COALESCE($5, budget),
           start_date = COALESCE($6, start_date),
           expected_end_date = COALESCE($7, expected_end_date),
           actual_end_date = COALESCE($8, actual_end_date),
           progress_percentage = COALESCE($9, progress_percentage),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        title, description, status, contractor, budget,
        start_date, expected_end_date, actual_end_date, progress_percentage,
        req.params.id,
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
       ORDER BY due_date ASC`,
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
    const { title, description, due_date, status, completed_date } = req.body;

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const result = await query(
      `INSERT INTO construction_milestones (project_id, title, description, due_date, status, completed_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, title, description || null, due_date || null, status || 'pending', completed_date || null]
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
    const { title, description, due_date, status, completed_date } = req.body;

    const result = await query(
      `UPDATE construction_milestones
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           due_date = COALESCE($3, due_date),
           status = COALESCE($4, status),
           completed_date = COALESCE($5, completed_date),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, description, due_date, status, completed_date, req.params.milestoneId]
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
