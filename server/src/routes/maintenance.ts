import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET / - list maintenance requests
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);
    const { property_id, status, priority } = req.query;

    let sql = `
      SELECT mr.*, p.name AS property_name,
             u.first_name AS requester_first_name, u.last_name AS requester_last_name
      FROM maintenance_requests mr
      LEFT JOIN properties p ON p.id = mr.property_id
      LEFT JOIN app_users u ON u.id = mr.requested_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      sql += ` AND mr.property_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND mr.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      sql += ` AND mr.priority = $${params.length}`;
    }

    const countResult = await query(
      sql.replace(/SELECT .* FROM/s, 'SELECT COUNT(*) FROM'),
      params
    );

    params.push(limit);
    sql += ` ORDER BY mr.created_at DESC LIMIT $${params.length}`;
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
    console.error('List maintenance requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get maintenance request by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT mr.*, p.name AS property_name,
              u.first_name AS requester_first_name, u.last_name AS requester_last_name
       FROM maintenance_requests mr
       LEFT JOIN properties p ON p.id = mr.property_id
       LEFT JOIN app_users u ON u.id = mr.requested_by
       WHERE mr.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Maintenance request not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get maintenance request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create maintenance request
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      property_id, title, description, category, priority,
      status, assigned_to, estimated_cost,
    } = req.body;

    if (!property_id || !title) {
      res.status(400).json({ error: 'property_id and title are required' });
      return;
    }

    const result = await query(
      `INSERT INTO maintenance_requests (property_id, title, description, category, priority, status, assigned_to, estimated_cost, requested_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        property_id, title, description || null, category || null,
        priority || 'medium', status || 'open', assigned_to || null,
        estimated_cost || null, req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create maintenance request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update maintenance request
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      title, description, category, priority, status,
      assigned_to, estimated_cost, actual_cost, completed_date, resolution_notes,
    } = req.body;

    const result = await query(
      `UPDATE maintenance_requests
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           priority = COALESCE($4, priority),
           status = COALESCE($5, status),
           assigned_to = COALESCE($6, assigned_to),
           estimated_cost = COALESCE($7, estimated_cost),
           actual_cost = COALESCE($8, actual_cost),
           completed_date = COALESCE($9, completed_date),
           resolution_notes = COALESCE($10, resolution_notes),
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        title, description, category, priority, status,
        assigned_to, estimated_cost, actual_cost, completed_date, resolution_notes,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Maintenance request not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update maintenance request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete maintenance request
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM maintenance_requests WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Maintenance request not found' });
      return;
    }

    res.json({ message: 'Maintenance request deleted successfully' });
  } catch (err) {
    console.error('Delete maintenance request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
