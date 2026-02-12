BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

-- Make user email comparisons case-insensitive for login/account matching.
ALTER TABLE app_users
  ALTER COLUMN email TYPE CITEXT;

-- =====================================================
-- Org membership model for multi-tenant web/mobile access
-- =====================================================
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('owner', 'admin', 'legal_manager', 'ops_manager', 'account_manager', 'support_agent', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'revoked')),
  invited_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_memberships_org_id_status ON organization_memberships(organization_id, status);
CREATE INDEX idx_org_memberships_user_id_status ON organization_memberships(user_id, status);

-- =====================================================
-- App/mobile session + device registration primitives
-- =====================================================
CREATE TABLE app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_name TEXT,
  platform TEXT CHECK (platform IN ('web', 'ios', 'android')),
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_session_dates CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE UNIQUE INDEX uq_app_sessions_refresh_token_hash ON app_sessions(refresh_token_hash);
CREATE INDEX idx_app_sessions_user_id_expires_at ON app_sessions(user_id, expires_at);

CREATE TABLE device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  device_identifier TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  push_token TEXT,
  app_version TEXT,
  locale TEXT,
  timezone TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, device_identifier)
);

CREATE INDEX idx_device_registrations_user_platform ON device_registrations(user_id, platform);

-- =====================================================
-- Team assignment and workflow hardening
-- =====================================================
CREATE TABLE property_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  assignment_role TEXT NOT NULL CHECK (assignment_role IN ('account_manager', 'legal_manager', 'ops_manager', 'inspector', 'support_agent')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_property_assignment_dates CHECK (unassigned_at IS NULL OR unassigned_at >= assigned_at)
);

CREATE INDEX idx_property_team_assignments_property_role ON property_team_assignments(property_id, assignment_role);
CREATE INDEX idx_property_team_assignments_user_role ON property_team_assignments(user_id, assignment_role);

-- Only one active primary owner per property
CREATE UNIQUE INDEX uq_property_primary_owner_active
  ON property_owners(property_id)
  WHERE ownership_type = 'primary' AND end_date IS NULL;

-- Protect money values from invalid negatives
ALTER TABLE rent_payments
  ADD CONSTRAINT chk_rent_payments_amounts_non_negative
  CHECK (amount_due >= 0 AND amount_paid >= 0);

ALTER TABLE invoices
  ADD CONSTRAINT chk_invoices_amounts_non_negative
  CHECK (subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0 AND amount_paid >= 0);

ALTER TABLE invoice_line_items
  ADD CONSTRAINT chk_invoice_line_items_non_negative
  CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0);

-- Ticket SLA metadata for service desk operations.
ALTER TABLE support_tickets
  ADD COLUMN first_response_due_at TIMESTAMPTZ,
  ADD COLUMN resolved_due_at TIMESTAMPTZ,
  ADD COLUMN first_response_at TIMESTAMPTZ;

-- =====================================================
-- Trigger coverage for new mutable tables
-- =====================================================
CREATE TRIGGER trg_organization_memberships_set_updated_at BEFORE UPDATE ON organization_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_app_sessions_set_updated_at BEFORE UPDATE ON app_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_device_registrations_set_updated_at BEFORE UPDATE ON device_registrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_property_team_assignments_set_updated_at BEFORE UPDATE ON property_team_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
