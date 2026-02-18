BEGIN;

-- =====================================================
-- Migration 0003: Complete presentation-vs-code gaps
--
-- Fills the 8 feature gaps identified during the
-- presentation-to-schema review:
--   1. Annual Legal Audit Framework
--   2. Property Expense Tracking (financial dashboard)
--   3. Construction Oversight
--   4. Escalation Matrix
--   5. Live Chat
--   6. Association Dues / Recurring Obligations
--   7. Revenue Record Granularity
--   8. Service Termination & Document Handover
-- =====================================================


-- =====================================================
-- 1. Annual Legal Audit Framework
--    Groups compliance_checks into scheduled audit cycles
--    with property-type-specific checklists.
-- =====================================================
CREATE TABLE audit_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  audit_year SMALLINT NOT NULL,
  audit_label TEXT NOT NULL,
  property_type_checklist TEXT NOT NULL CHECK (property_type_checklist IN (
    'apartment', 'independent_house', 'villa', 'bungalow',
    'plot', 'commercial', 'agricultural_land'
  )),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'in_progress', 'completed', 'overdue'
  )),
  scheduled_start DATE NOT NULL,
  scheduled_end DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES app_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_audit_cycle_dates CHECK (scheduled_end >= scheduled_start),
  CONSTRAINT valid_audit_completion CHECK (completed_at IS NULL OR completed_at >= scheduled_start::timestamptz),
  UNIQUE (property_id, audit_year)
);

CREATE INDEX idx_audit_cycles_property_id ON audit_cycles(property_id);
CREATE INDEX idx_audit_cycles_status ON audit_cycles(status);
CREATE INDEX idx_audit_cycles_year ON audit_cycles(audit_year);

-- Link compliance_checks to an audit cycle so individual checks
-- can be grouped under an annual review.
ALTER TABLE compliance_checks
  ADD COLUMN audit_cycle_id UUID REFERENCES audit_cycles(id) ON DELETE SET NULL;

CREATE INDEX idx_compliance_checks_audit_cycle_id ON compliance_checks(audit_cycle_id);


-- =====================================================
-- 2. Property Expense Tracking
--    General-purpose expense ledger for property taxes,
--    utility bills, association dues, ad-hoc costs, etc.
-- =====================================================
CREATE TABLE property_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  expense_category TEXT NOT NULL CHECK (expense_category IN (
    'property_tax', 'utility', 'association_dues', 'insurance',
    'maintenance', 'legal', 'renovation', 'brokerage', 'other'
  )),
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  expense_date DATE NOT NULL,
  due_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'paid', 'overdue', 'waived', 'partially_paid'
  )),
  receipt_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  vendor_name TEXT,
  reference_number TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_interval TEXT CHECK (recurrence_interval IN (
    'monthly', 'quarterly', 'semi_annual', 'annual'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_property_expenses_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_property_expenses_property_id ON property_expenses(property_id);
CREATE INDEX idx_property_expenses_category ON property_expenses(expense_category);
CREATE INDEX idx_property_expenses_date ON property_expenses(expense_date);
CREATE INDEX idx_property_expenses_payment_status ON property_expenses(payment_status);


-- =====================================================
-- 3. Construction Oversight
--    Track construction / renovation projects with
--    milestones, budget, and contractor details.
-- =====================================================
CREATE TABLE construction_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  managed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  project_type TEXT NOT NULL CHECK (project_type IN (
    'new_construction', 'renovation', 'interior_fit_out',
    'civil_repair', 'painting', 'landscaping', 'other'
  )),
  title TEXT NOT NULL,
  description TEXT,
  contractor_name TEXT,
  contractor_phone TEXT,
  estimated_budget NUMERIC(14, 2),
  actual_spend NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'on_hold', 'completed', 'cancelled'
  )),
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_construction_planned_dates CHECK (planned_end IS NULL OR planned_start IS NULL OR planned_end >= planned_start),
  CONSTRAINT valid_construction_actual_dates CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_end >= actual_start),
  CONSTRAINT chk_construction_budget_non_negative CHECK (estimated_budget IS NULL OR estimated_budget >= 0),
  CONSTRAINT chk_construction_spend_non_negative CHECK (actual_spend >= 0)
);

CREATE INDEX idx_construction_projects_property_id ON construction_projects(property_id);
CREATE INDEX idx_construction_projects_status ON construction_projects(status);

CREATE TABLE construction_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sequence_order SMALLINT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'skipped'
  )),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_construction_milestones_project_id ON construction_milestones(project_id);


-- =====================================================
-- 4. Escalation Matrix
--    Configurable escalation rules that define when and
--    how tickets / cases should be escalated.
-- =====================================================
CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'support_ticket', 'legal_case', 'maintenance_request'
  )),
  trigger_condition TEXT NOT NULL CHECK (trigger_condition IN (
    'sla_breach', 'priority_critical', 'no_response',
    'unresolved_past_due', 'manual'
  )),
  priority_filter TEXT CHECK (priority_filter IN ('low', 'medium', 'high', 'critical')),
  breach_threshold_minutes INT,
  escalate_to_role TEXT NOT NULL REFERENCES roles(code),
  notify_channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalation_rules_entity_type ON escalation_rules(entity_type);
CREATE INDEX idx_escalation_rules_active ON escalation_rules(is_active);

CREATE TABLE escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES escalation_rules(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  escalated_to UUID REFERENCES app_users(id) ON DELETE SET NULL,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalation_events_entity ON escalation_events(entity_type, entity_id);
CREATE INDEX idx_escalation_events_rule_id ON escalation_events(rule_id);


-- =====================================================
-- 5. Live Chat
--    Real-time chat rooms between owners and support
--    agents / account managers, separate from tickets.
-- =====================================================
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  room_type TEXT NOT NULL CHECK (room_type IN (
    'support', 'legal', 'operations', 'general'
  )),
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'archived', 'closed'
  )),
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_property_id ON chat_rooms(property_id);
CREATE INDEX idx_chat_rooms_status ON chat_rooms(status);

CREATE TABLE chat_room_participants (
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (chat_room_id, user_id)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  message_body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN (
    'text', 'image', 'document', 'system'
  )),
  attachment_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room_id ON chat_messages(chat_room_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);


-- =====================================================
-- 6. Association Dues / Recurring Property Obligations
--    Track apartment association dues, sinking funds,
--    special assessments, and similar recurring charges.
-- =====================================================
CREATE TABLE property_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  obligation_type TEXT NOT NULL CHECK (obligation_type IN (
    'association_dues', 'sinking_fund', 'special_assessment',
    'parking_charges', 'club_membership', 'water_charges',
    'generator_charges', 'other'
  )),
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  billing_frequency TEXT NOT NULL CHECK (billing_frequency IN (
    'monthly', 'quarterly', 'semi_annual', 'annual', 'one_time'
  )),
  effective_from DATE NOT NULL,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_obligation_amount_positive CHECK (amount > 0),
  CONSTRAINT valid_obligation_dates CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE INDEX idx_property_obligations_property_id ON property_obligations(property_id);
CREATE INDEX idx_property_obligations_type ON property_obligations(obligation_type);

CREATE TABLE obligation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES property_obligations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount_due NUMERIC(12, 2) NOT NULL,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'due' CHECK (payment_status IN (
    'due', 'paid', 'partially_paid', 'overdue', 'waived'
  )),
  paid_on TIMESTAMPTZ,
  reference_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_obligation_payment_amounts CHECK (amount_due >= 0 AND amount_paid >= 0),
  CONSTRAINT valid_obligation_period CHECK (period_end >= period_start)
);

CREATE INDEX idx_obligation_payments_obligation_id ON obligation_payments(obligation_id);
CREATE INDEX idx_obligation_payments_status ON obligation_payments(payment_status);


-- =====================================================
-- 7. Revenue Record Granularity
--    State-specific land revenue records for plots and
--    farmland: Patta, RTC, Adangal, Pahani, survey data.
-- =====================================================
CREATE TABLE revenue_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN (
    'patta', 'rtc', 'adangal', 'pahani', 'chitta',
    'fmb', 'tippan', 'mutation_extract', 'other'
  )),
  state_code TEXT NOT NULL,
  district TEXT,
  taluk TEXT,
  village TEXT,
  survey_number TEXT,
  sub_division TEXT,
  extent_acres NUMERIC(10, 4),
  extent_hectares NUMERIC(10, 4),
  land_classification TEXT CHECK (land_classification IN (
    'wet', 'dry', 'garden', 'manavari', 'plantation',
    'residential', 'commercial', 'government', 'other'
  )),
  current_holder_name TEXT,
  cultivation_details TEXT,
  pattadar_passbook_number TEXT,
  last_verified_on DATE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_records_property_id ON revenue_records(property_id);
CREATE INDEX idx_revenue_records_type ON revenue_records(record_type);
CREATE INDEX idx_revenue_records_survey ON revenue_records(survey_number);
CREATE INDEX idx_revenue_records_state ON revenue_records(state_code);


-- =====================================================
-- 8. Service Termination & Document Handover
--    Formal workflow for when a client terminates service,
--    tracking document handover and exit procedures.
-- =====================================================
CREATE TABLE service_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES property_subscriptions(id) ON DELETE SET NULL,
  initiated_by UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  handled_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  handover_type TEXT NOT NULL CHECK (handover_type IN (
    'termination', 'provider_switch', 'ownership_transfer'
  )),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated', 'documents_pending', 'in_progress',
    'completed', 'cancelled'
  )),
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_completion_date DATE,
  completed_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_handover_completion CHECK (completed_at IS NULL OR completed_at >= initiated_at)
);

CREATE INDEX idx_service_handovers_property_id ON service_handovers(property_id);
CREATE INDEX idx_service_handovers_status ON service_handovers(status);

CREATE TABLE handover_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES service_handovers(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'document_return', 'key_return', 'access_revocation',
    'data_export', 'final_settlement', 'deposit_refund',
    'account_closure', 'other'
  )),
  description TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'not_applicable'
  )),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_handover_items_handover_id ON handover_items(handover_id);
CREATE INDEX idx_handover_items_status ON handover_items(status);


-- =====================================================
-- Attach updated_at triggers to all new mutable tables
-- =====================================================
CREATE TRIGGER trg_audit_cycles_set_updated_at BEFORE UPDATE ON audit_cycles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_property_expenses_set_updated_at BEFORE UPDATE ON property_expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_construction_projects_set_updated_at BEFORE UPDATE ON construction_projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_construction_milestones_set_updated_at BEFORE UPDATE ON construction_milestones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_escalation_rules_set_updated_at BEFORE UPDATE ON escalation_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_chat_rooms_set_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_property_obligations_set_updated_at BEFORE UPDATE ON property_obligations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_obligation_payments_set_updated_at BEFORE UPDATE ON obligation_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_revenue_records_set_updated_at BEFORE UPDATE ON revenue_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_service_handovers_set_updated_at BEFORE UPDATE ON service_handovers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_handover_items_set_updated_at BEFORE UPDATE ON handover_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
