-- Phase 4: RRA fiscal — tax configs, fiscal fields on sales, Z-reports, receipt config

CREATE TABLE tax_configs (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    name            VARCHAR(120) NOT NULL,
    rate            NUMERIC(8, 6) NOT NULL,
    type            VARCHAR(16) NOT NULL,
    applies_to      VARCHAR(16) NOT NULL DEFAULT 'ALL',
    category_code   VARCHAR(64),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tax_configs_tenant_name UNIQUE (tenant_id, name),
    CONSTRAINT chk_tax_configs_type CHECK (type IN ('INCLUSIVE', 'EXCLUSIVE')),
    CONSTRAINT chk_tax_configs_applies CHECK (applies_to IN ('ALL', 'CATEGORY', 'PRODUCT'))
);

CREATE INDEX idx_tax_configs_tenant ON tax_configs (tenant_id);

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS tax_config_id UUID REFERENCES tax_configs (id);

ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS tax_config_id UUID REFERENCES tax_configs (id);

ALTER TABLE finance_customers
    ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS till_session_id UUID REFERENCES till_sessions (id),
    ADD COLUMN IF NOT EXISTS net_amount NUMERIC(19, 4),
    ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(19, 4),
    ADD COLUMN IF NOT EXISTS fiscal_signature VARCHAR(500),
    ADD COLUMN IF NOT EXISTS fiscal_qr_data TEXT,
    ADD COLUMN IF NOT EXISTS tax_exempt_sale BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE pos_sale_lines
    ADD COLUMN IF NOT EXISTS net_amount NUMERIC(19, 4),
    ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(19, 4);

ALTER TABLE ebm_receipts
    ADD COLUMN IF NOT EXISTS fiscal_qr_data TEXT;

CREATE TABLE z_reports (
    id                  UUID PRIMARY KEY,
    tenant_id           UUID NOT NULL,
    till_session_id     UUID NOT NULL REFERENCES till_sessions (id),
    report_type         VARCHAR(8) NOT NULL,
    opening_float       NUMERIC(19, 4) NOT NULL,
    total_sales_cash    NUMERIC(19, 4) NOT NULL DEFAULT 0,
    total_sales_momo    NUMERIC(19, 4) NOT NULL DEFAULT 0,
    total_sales_airtel  NUMERIC(19, 4) NOT NULL DEFAULT 0,
    total_sales_card    NUMERIC(19, 4) NOT NULL DEFAULT 0,
    total_sales_on_account NUMERIC(19, 4) NOT NULL DEFAULT 0,
    total_returns       NUMERIC(19, 4) NOT NULL DEFAULT 0,
    total_discounts     NUMERIC(19, 4) NOT NULL DEFAULT 0,
    total_vat_collected NUMERIC(19, 4) NOT NULL DEFAULT 0,
    closing_cash        NUMERIC(19, 4),
    variance            NUMERIC(19, 4),
    cashier_name        VARCHAR(255),
    register_name       VARCHAR(128),
    payload_json        JSONB NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_z_reports_type CHECK (report_type IN ('Z', 'X'))
);

CREATE INDEX idx_z_reports_session ON z_reports (tenant_id, till_session_id);

CREATE TABLE receipt_configs (
    tenant_id           UUID PRIMARY KEY,
    business_name       VARCHAR(255),
    business_tin        VARCHAR(20),
    logo_base64         TEXT,
    footer_text         VARCHAR(500),
    show_vat_breakdown  BOOLEAN NOT NULL DEFAULT TRUE,
    paper_width_mm      INTEGER NOT NULL DEFAULT 58,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Demo tenant: standard 18% inclusive VAT
INSERT INTO tax_configs (id, tenant_id, name, rate, type, applies_to, is_active, created_at)
VALUES (
    'f1111111-1111-4111-8111-111111111101'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Rwanda VAT 18%',
    0.18,
    'INCLUSIVE',
    'ALL',
    TRUE,
    NOW()
)
ON CONFLICT (tenant_id, name) DO NOTHING;

UPDATE locations
SET tax_config_id = 'f1111111-1111-4111-8111-111111111101'::uuid
WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  AND tax_config_id IS NULL;

INSERT INTO receipt_configs (tenant_id, business_name, business_tin, footer_text, show_vat_breakdown, paper_width_mm, updated_at)
VALUES (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Demo Retail Co',
    '123456789',
    'Thank you for shopping with us',
    TRUE,
    58,
    NOW()
)
ON CONFLICT (tenant_id) DO NOTHING;

ALTER TABLE tax_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_configs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tax_configs_tenant_policy ON tax_configs;
CREATE POLICY tax_configs_tenant_policy ON tax_configs
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE z_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE z_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS z_reports_tenant_policy ON z_reports;
CREATE POLICY z_reports_tenant_policy ON z_reports
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE receipt_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_configs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS receipt_configs_tenant_policy ON receipt_configs;
CREATE POLICY receipt_configs_tenant_policy ON receipt_configs
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
