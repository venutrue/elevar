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
      `SELECT ee.*, er.rule_name, er.entity_type,
              u.first_name AS escalated_to_first_name, u.last_name AS escalated_to_last_name
       FROM escalation_events ee
       LEFT JOIN escalation_rules er ON er.id = ee.rule_id
       LEFT JOIN app_users u ON u.id = ee.escalated_to
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
    const { rule_id, entity_type, entity_id, escalated_to, resolution_notes } = req.body;

    if (!entity_type || !entity_id) {
      res.status(400).json({ error: 'entity_type and entity_id are required' });
      return;
    }

    const result = await query(
      `INSERT INTO escalation_events (rule_id, entity_type, entity_id, escalated_to, resolution_notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [rule_id || null, entity_type, entity_id, escalated_to || null, resolution_notes || null]
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
      rule_name, entity_type, trigger_condition, priority_filter,
      breach_threshold_minutes, escalate_to_role, notify_channels, is_active,
    } = req.body;

    if (!rule_name || !entity_type || !escalate_to_role) {
      res.status(400).json({ error: 'rule_name, entity_type, and escalate_to_role are required' });
      return;
    }

    const result = await query(
      `INSERT INTO escalation_rules (rule_name, entity_type, trigger_condition, priority_filter, breach_threshold_minutes, escalate_to_role, notify_channels, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        rule_name, entity_type,
        trigger_condition || null, priority_filter || null,
        breach_threshold_minutes || null, escalate_to_role,
        notify_channels ? JSON.stringify(notify_channels) : null,
        is_active !== undefined ? is_active : true,
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
      rule_name, entity_type, trigger_condition, priority_filter,
      breach_threshold_minutes, escalate_to_role, notify_channels, is_active,
    } = req.body;

    const result = await query(
      `UPDATE escalation_rules
       SET rule_name = COALESCE($1, rule_name),
           entity_type = COALESCE($2, entity_type),
           trigger_condition = COALESCE($3, trigger_condition),
           priority_filter = COALESCE($4, priority_filter),
           breach_threshold_minutes = COALESCE($5, breach_threshold_minutes),
           escalate_to_role = COALESCE($6, escalate_to_role),
           notify_channels = COALESCE($7, notify_channels),
           is_active = COALESCE($8, is_active),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        rule_name, entity_type, trigger_condition, priority_filter,
        breach_threshold_minutes, escalate_to_role,
        notify_channels ? JSON.stringify(notify_channels) : null,
        is_active, req.params.id,
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
