import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paginate } from '../utils/helpers';

const router = Router();
router.use(authenticate);

// GET /events - list escalation events (defined before /:id to avoid conflict)
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);

    const result = await query(
      `SELECT ee.*, er.name AS rule_name, er.entity_type, er.escalation_action,
              u.first_name AS triggered_by_first_name, u.last_name AS triggered_by_last_name
       FROM escalation_events ee
       LEFT JOIN escalation_rules er ON er.id = ee.rule_id
       LEFT JOIN app_users u ON u.id = ee.triggered_by
       ORDER BY ee.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List escalation events error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /events - create escalation event
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { rule_id, entity_type, entity_id, description, metadata } = req.body;

    if (!entity_type || !entity_id) {
      res.status(400).json({ error: 'entity_type and entity_id are required' });
      return;
    }

    const result = await query(
      `INSERT INTO escalation_events (rule_id, entity_type, entity_id, description, metadata, triggered_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [rule_id || null, entity_type, entity_id, description || null, metadata ? JSON.stringify(metadata) : null, req.user!.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create escalation event error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list escalation rules
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = paginate(req);

    const result = await query(
      `SELECT * FROM escalation_rules
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List escalation rules error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get escalation rule by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM escalation_rules WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Escalation rule not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get escalation rule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create escalation rule
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name, description, entity_type, condition_field,
      condition_operator, condition_value, escalation_action,
      notify_roles, notify_users, is_active, threshold_days,
    } = req.body;

    if (!name || !entity_type || !escalation_action) {
      res.status(400).json({ error: 'name, entity_type, and escalation_action are required' });
      return;
    }

    const result = await query(
      `INSERT INTO escalation_rules (name, description, entity_type, condition_field, condition_operator, condition_value, escalation_action, notify_roles, notify_users, is_active, threshold_days, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        name, description || null, entity_type,
        condition_field || null, condition_operator || null,
        condition_value || null, escalation_action,
        notify_roles ? JSON.stringify(notify_roles) : null,
        notify_users ? JSON.stringify(notify_users) : null,
        is_active !== undefined ? is_active : true,
        threshold_days || null, req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create escalation rule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update escalation rule
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      name, description, entity_type, condition_field,
      condition_operator, condition_value, escalation_action,
      notify_roles, notify_users, is_active, threshold_days,
    } = req.body;

    const result = await query(
      `UPDATE escalation_rules
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           entity_type = COALESCE($3, entity_type),
           condition_field = COALESCE($4, condition_field),
           condition_operator = COALESCE($5, condition_operator),
           condition_value = COALESCE($6, condition_value),
           escalation_action = COALESCE($7, escalation_action),
           notify_roles = COALESCE($8, notify_roles),
           notify_users = COALESCE($9, notify_users),
           is_active = COALESCE($10, is_active),
           threshold_days = COALESCE($11, threshold_days),
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        name, description, entity_type, condition_field,
        condition_operator, condition_value, escalation_action,
        notify_roles ? JSON.stringify(notify_roles) : null,
        notify_users ? JSON.stringify(notify_users) : null,
        is_active, threshold_days, req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Escalation rule not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update escalation rule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete escalation rule
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM escalation_rules WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Escalation rule not found' });
      return;
    }

    res.json({ message: 'Escalation rule deleted successfully' });
  } catch (err) {
    console.error('Delete escalation rule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
