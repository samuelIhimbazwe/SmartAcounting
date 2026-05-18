ALTER TABLE fixed_assets
    ADD COLUMN IF NOT EXISTS asset_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS location VARCHAR(100),
    ADD COLUMN IF NOT EXISTS purchase_date DATE,
    ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(19,4),
    ADD COLUMN IF NOT EXISTS salvage_value NUMERIC(19,4),
    ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(50) DEFAULT 'STRAIGHT_LINE',
    ADD COLUMN IF NOT EXISTS accumulated_depreciation NUMERIC(19,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_book_value NUMERIC(19,4),
    ADD COLUMN IF NOT EXISTS disposed_date DATE,
    ADD COLUMN IF NOT EXISTS disposal_proceeds NUMERIC(19,4),
    ADD COLUMN IF NOT EXISTS disposal_gain_loss NUMERIC(19,4),
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'RWF';

UPDATE fixed_assets
SET asset_code = 'FA-' || replace(id::text, '-', '')
WHERE asset_code IS NULL;

UPDATE fixed_assets
SET purchase_date = acquisition_date
WHERE purchase_date IS NULL AND acquisition_date IS NOT NULL;

UPDATE fixed_assets
SET purchase_cost = acquisition_cost
WHERE purchase_cost IS NULL AND acquisition_cost IS NOT NULL;

UPDATE fixed_assets
SET salvage_value = COALESCE(residual_value, 0)
WHERE salvage_value IS NULL;

UPDATE fixed_assets
SET net_book_value = COALESCE(purchase_cost, acquisition_cost, 0)
    - COALESCE(accumulated_depreciation, 0)
WHERE net_book_value IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fixed_assets_tenant_asset_code
    ON fixed_assets (tenant_id, asset_code)
    WHERE asset_code IS NOT NULL;

CREATE TABLE accruals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    accrual_type VARCHAR(50) NOT NULL,
    description VARCHAR(300) NOT NULL,
    amount NUMERIC(19,4) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    start_date DATE NOT NULL,
    end_date DATE,
    months_total INTEGER,
    monthly_amount NUMERIC(19,4),
    debit_account VARCHAR(100) NOT NULL,
    credit_account VARCHAR(100) NOT NULL,
    auto_reverse BOOLEAN DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    last_posted_period VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    run_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    total_amount NUMERIC(19,4) DEFAULT 0,
    payment_count INTEGER DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_run_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    payment_run_id UUID NOT NULL REFERENCES payment_runs(id),
    supplier_bill_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(200) NOT NULL,
    invoice_reference VARCHAR(100),
    invoice_amount NUMERIC(19,4) NOT NULL,
    outstanding_amount NUMERIC(19,4) NOT NULL,
    payment_amount NUMERIC(19,4) NOT NULL,
    due_date DATE,
    days_overdue INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fixed_assets_tenant_status_v58 ON fixed_assets(tenant_id, status);
CREATE INDEX idx_accruals_tenant ON accruals(tenant_id, status);
CREATE INDEX idx_payment_runs_tenant ON payment_runs(tenant_id, status);

ALTER TABLE accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE accruals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accruals_tenant_policy ON accruals;
CREATE POLICY accruals_tenant_policy ON accruals
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE payment_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_runs_tenant_policy ON payment_runs;
CREATE POLICY payment_runs_tenant_policy ON payment_runs
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE payment_run_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_run_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_run_lines_tenant_policy ON payment_run_lines;
CREATE POLICY payment_run_lines_tenant_policy ON payment_run_lines
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
