BEGIN;

INSERT INTO roles (code, name, description)
VALUES
  ('owner', 'Property Owner', 'NRI or resident owner with property visibility and approvals.'),
  ('legal_manager', 'Legal Manager', 'Handles legal and compliance workflows.'),
  ('ops_manager', 'Operations Manager', 'Handles inspections, maintenance and tenancy operations.'),
  ('account_manager', 'Account Manager', 'Primary SPOC for owner communication.'),
  ('support_agent', 'Support Agent', 'Handles service desk interactions and escalations.'),
  ('inspector', 'Field Inspector', 'Performs physical inspections and uploads geo-tagged reports.'),
  ('viewer', 'Read-only User', 'Has read-only visibility for selected entities.'),
  ('admin', 'Platform Admin', 'Platform-wide administration permissions.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO subscription_plans (plan_code, name, description, billing_cycle, base_price, currency_code)
VALUES
  ('basic', 'Basic', 'Quarterly inspections, app access, basic maintenance coordination.', 'monthly', 14999.00, 'INR'),
  ('comprehensive', 'Comprehensive', 'Bi-weekly inspections, emergency maintenance, legal support routing.', 'monthly', 29999.00, 'INR'),
  ('premium', 'Premium', 'Full legal + property management with priority response SLA.', 'monthly', 49999.00, 'INR')
ON CONFLICT (plan_code) DO NOTHING;

COMMIT;
