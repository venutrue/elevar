import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /stats - overview counts
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      propertiesResult,
      tenanciesResult,
      legalCasesResult,
      complianceResult,
      maintenanceResult,
      ticketsResult,
      notificationsResult,
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM properties'),
      query("SELECT COUNT(*) FROM tenancies WHERE status = 'active'"),
      query("SELECT COUNT(*) FROM legal_cases WHERE status IN ('open', 'in_progress')"),
      query("SELECT COUNT(*) FROM compliance_checks WHERE status = 'pending'"),
      query("SELECT COUNT(*) FROM maintenance_requests WHERE status IN ('open', 'in_progress')"),
      query("SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress')"),
      query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [req.user!.id]),
    ]);

    res.json({
      total_properties: parseInt(propertiesResult.rows[0].count, 10),
      active_tenancies: parseInt(tenanciesResult.rows[0].count, 10),
      open_legal_cases: parseInt(legalCasesResult.rows[0].count, 10),
      pending_compliance_checks: parseInt(complianceResult.rows[0].count, 10),
      open_maintenance_requests: parseInt(maintenanceResult.rows[0].count, 10),
      open_tickets: parseInt(ticketsResult.rows[0].count, 10),
      unread_notifications: parseInt(notificationsResult.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /recent-activity - latest 10 audit logs
router.get('/recent-activity', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT al.*, u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN app_users u ON u.id = al.actor_user_id
       ORDER BY al.created_at DESC
       LIMIT 10`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Recent activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /financial-summary - rent collection, expense totals, subscription info
router.get('/financial-summary', async (req: Request, res: Response) => {
  try {
    // Get rent collection stats for current month
    const rentResult = await query(
      `SELECT
         COUNT(*) AS total_payments,
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS collected,
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) AS overdue
       FROM rent_payments
       WHERE due_date >= date_trunc('month', CURRENT_DATE)
         AND due_date < date_trunc('month', CURRENT_DATE) + interval '1 month'`
    );

    // Get expense totals for current month
    const expenseResult = await query(
      `SELECT
         COUNT(*) AS total_expenses,
         COALESCE(SUM(amount), 0) AS total_amount
       FROM property_expenses
       WHERE expense_date >= date_trunc('month', CURRENT_DATE)
         AND expense_date < date_trunc('month', CURRENT_DATE) + interval '1 month'`
    );

    // Get subscription info for current user
    const subscriptionResult = await query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user!.id]
    );

    res.json({
      rent: {
        total_payments: parseInt(rentResult.rows[0].total_payments, 10),
        collected: parseFloat(rentResult.rows[0].collected) || 0,
        pending: parseFloat(rentResult.rows[0].pending) || 0,
        overdue: parseFloat(rentResult.rows[0].overdue) || 0,
      },
      expenses: {
        total_expenses: parseInt(expenseResult.rows[0].total_expenses, 10),
        total_amount: parseFloat(expenseResult.rows[0].total_amount) || 0,
      },
      subscription: subscriptionResult.rows[0] || null,
    });
  } catch (err) {
    console.error('Financial summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /upcoming - upcoming inspections, compliance due dates, rent due dates
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const [inspectionsResult, complianceResult, rentResult] = await Promise.all([
      query(
        `SELECT i.id, i.inspection_type, i.scheduled_date, i.status, p.name AS property_name
         FROM inspections i
         JOIN properties p ON p.id = i.property_id
         WHERE i.scheduled_date >= CURRENT_DATE
           AND i.status IN ('scheduled', 'pending')
         ORDER BY i.scheduled_date ASC
         LIMIT 10`
      ),
      query(
        `SELECT cc.id, cc.check_type, cc.title, cc.due_date, cc.status, p.name AS property_name
         FROM compliance_checks cc
         LEFT JOIN properties p ON p.id = cc.property_id
         WHERE cc.due_date >= CURRENT_DATE
           AND cc.status IN ('pending', 'in_progress')
         ORDER BY cc.due_date ASC
         LIMIT 10`
      ),
      query(
        `SELECT rp.id, rp.amount, rp.due_date, rp.status, p.name AS property_name
         FROM rent_payments rp
         JOIN tenancies t ON t.id = rp.tenancy_id
         JOIN properties p ON p.id = t.property_id
         WHERE rp.due_date >= CURRENT_DATE
           AND rp.status = 'pending'
         ORDER BY rp.due_date ASC
         LIMIT 10`
      ),
    ]);

    res.json({
      upcoming_inspections: inspectionsResult.rows,
      upcoming_compliance: complianceResult.rows,
      upcoming_rent: rentResult.rows,
    });
  } catch (err) {
    console.error('Upcoming items error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
