CREATE TABLE pos_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    return_number VARCHAR(50) NOT NULL,
    original_transaction_id VARCHAR(200),
    original_transaction_date DATE,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cashier_id VARCHAR(200) NOT NULL,
    till_code VARCHAR(50),
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    total_refund_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
    refund_method VARCHAR(50) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    notes TEXT,
    requires_manager_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, return_number)
);

CREATE TABLE pos_return_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    return_id UUID NOT NULL REFERENCES pos_returns(id),
    product_id UUID NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(300) NOT NULL,
    quantity NUMERIC(19,4) NOT NULL,
    unit_price NUMERIC(19,4) NOT NULL,
    refund_amount NUMERIC(19,4) NOT NULL,
    restock BOOLEAN DEFAULT TRUE,
    condition VARCHAR(50) DEFAULT 'RESALEABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shrinkage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    product_id UUID NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(300) NOT NULL,
    quantity NUMERIC(19,4) NOT NULL,
    unit_cost NUMERIC(19,4) NOT NULL,
    total_cost NUMERIC(19,4) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    recorded_by UUID NOT NULL,
    approved_by UUID,
    location VARCHAR(100) DEFAULT 'SHOP',
    incident_date DATE NOT NULL,
    notes TEXT,
    journal_entry_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_returns_tenant ON pos_returns(tenant_id, return_date);
CREATE INDEX idx_shrinkage_tenant ON shrinkage_records(tenant_id, incident_date);

ALTER TABLE pos_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_returns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pos_returns_tenant_policy ON pos_returns;
CREATE POLICY pos_returns_tenant_policy ON pos_returns
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE pos_return_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_return_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pos_return_lines_tenant_policy ON pos_return_lines;
CREATE POLICY pos_return_lines_tenant_policy ON pos_return_lines
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE shrinkage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shrinkage_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shrinkage_records_tenant_policy ON shrinkage_records;
CREATE POLICY shrinkage_records_tenant_policy ON shrinkage_records
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
