CREATE TABLE IF NOT EXISTS inventory_balances (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    product_id UUID NOT NULL,
    location_code VARCHAR(120) NOT NULL,
    quantity NUMERIC(20,4) NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, product_id, location_code)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    product_id UUID NOT NULL,
    from_location_code VARCHAR(120) NOT NULL,
    to_location_code VARCHAR(120) NOT NULL,
    quantity NUMERIC(20,4) NOT NULL,
    movement_type VARCHAR(40) NOT NULL,
    batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    request_type VARCHAR(80) NOT NULL,
    reference_id VARCHAR(120),
    approver_role VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_balances_tenant_policy ON inventory_balances;
CREATE POLICY inventory_balances_tenant_policy ON inventory_balances
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_movements_tenant_policy ON stock_movements;
CREATE POLICY stock_movements_tenant_policy ON stock_movements
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approval_requests_tenant_policy ON approval_requests;
CREATE POLICY approval_requests_tenant_policy ON approval_requests
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
