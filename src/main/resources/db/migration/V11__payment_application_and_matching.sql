CREATE TABLE IF NOT EXISTS payment_applications (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    payment_id UUID NOT NULL,
    target_type VARCHAR(30) NOT NULL, -- INVOICE / SUPPLIER_BILL
    target_id UUID NOT NULL,
    applied_amount NUMERIC(20,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliation_match_items (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    item_type VARCHAR(30) NOT NULL, -- PAYMENT / INVOICE / SUPPLIER_BILL
    item_id UUID NOT NULL,
    amount NUMERIC(20,4) NOT NULL,
    matched BOOLEAN NOT NULL DEFAULT FALSE,
    match_group VARCHAR(120),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_app_tenant_target ON payment_applications (tenant_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_recon_match_tenant_matched ON reconciliation_match_items (tenant_id, matched);

ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_applications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_applications_tenant_policy ON payment_applications;
CREATE POLICY payment_applications_tenant_policy ON payment_applications
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE reconciliation_match_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_match_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reconciliation_match_items_tenant_policy ON reconciliation_match_items;
CREATE POLICY reconciliation_match_items_tenant_policy ON reconciliation_match_items
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
