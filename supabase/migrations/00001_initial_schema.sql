-- Supplier RFQ Platform - Initial Schema
-- Version 1: Standalone (no ERP integration)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'INTERNAL_SALES', 'FIELD_SALES');
CREATE TYPE rfq_status AS ENUM ('draft', 'sent', 'opened', 'quoted', 'declined', 'expired');
CREATE TYPE project_status AS ENUM ('draft', 'rfqs_sent', 'quoting', 'completed', 'cancelled');
CREATE TYPE decoration_cost_type AS ENUM ('per_unit', 'flat_rate');
CREATE TYPE decline_reason AS ENUM ('not_in_range', 'quantity_too_small', 'deadline_not_feasible', 'no_capacity', 'other');
CREATE TYPE counter_offer_status AS ENUM ('pending', 'accepted', 'declined', 'countered');

-- ============================================
-- USERS (internal only)
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'INTERNAL_SALES',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SUPPLIERS (master data, separate from enquiry data)
-- ============================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'de' CHECK (language IN ('de', 'en')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  external_supplier_id TEXT,
  customer_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_categories (
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, category_id)
);

-- ============================================
-- PROJECTS (customer enquiries)
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'draft',
  quote_deadline DATE NOT NULL,
  requested_delivery_date DATE,
  internal_description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  decoration_method TEXT,
  number_of_colors INTEGER,
  print_area TEXT,
  material_preference TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_item_quantity_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_item_id UUID NOT NULL REFERENCES project_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================
-- RFQs (one per supplier per project)
-- ============================================

CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  status rfq_status NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  decline_reason decline_reason,
  decline_reason_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, supplier_id)
);

-- ============================================
-- QUOTES (supplier responses)
-- ============================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  project_item_id UUID NOT NULL REFERENCES project_items(id),
  currency TEXT NOT NULL DEFAULT 'EUR',
  setup_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  decoration_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  decoration_cost_type decoration_cost_type NOT NULL DEFAULT 'flat_rate',
  freight_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  sample_cost NUMERIC(12,2) DEFAULT 0,
  lead_time_days INTEGER,
  minimum_order_quantity INTEGER,
  price_valid_until DATE,
  alternative_product TEXT,
  country_of_origin TEXT,
  supplier_item_number TEXT,
  comment TEXT,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quote_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- COUNTER OFFERS
-- ============================================

CREATE TABLE counter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  offered_by_internal BOOLEAN NOT NULL DEFAULT true,
  status counter_offer_status NOT NULL DEFAULT 'pending',
  unit_prices JSONB NOT NULL,
  setup_cost NUMERIC(12,2),
  decoration_cost NUMERIC(12,2),
  freight_cost NUMERIC(12,2),
  message TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- MESSAGES (visible to supplier)
-- ============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('internal', 'supplier')),
  sender_user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INTERNAL NOTES (NEVER visible to suppliers)
-- Separate table + separate API = defense in depth
-- ============================================

CREATE TABLE internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ATTACHMENTS
-- ============================================

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_item_id UUID REFERENCES project_items(id) ON DELETE CASCADE,
  rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  visible_to_supplier BOOLEAN NOT NULL DEFAULT false,
  uploaded_by_supplier BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_rfqs_token ON rfqs(token);
CREATE INDEX idx_rfqs_project ON rfqs(project_id);
CREATE INDEX idx_rfqs_supplier ON rfqs(supplier_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_quotes_rfq ON quotes(rfq_id);
CREATE INDEX idx_quotes_winner ON quotes(is_winner) WHERE is_winner = true;
CREATE INDEX idx_messages_rfq ON messages(rfq_id);
CREATE INDEX idx_internal_notes_project ON internal_notes(project_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
CREATE INDEX idx_project_items_project ON project_items(project_id);
CREATE INDEX idx_attachments_project ON attachments(project_id);

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_suppliers BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_rfqs BEFORE UPDATE ON rfqs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_quotes BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUTO PROJECT NUMBER GENERATION
-- ============================================

CREATE SEQUENCE project_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number = 'P-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('project_number_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_number BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION generate_project_number();
