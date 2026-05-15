CREATE TABLE cashier_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    cashier_id VARCHAR(200) NOT NULL,
    cashier_name VARCHAR(300) NOT NULL,
    shift_date DATE NOT NULL,
    till_code VARCHAR(50),
    transaction_count INTEGER DEFAULT 0,
    total_sales NUMERIC(19,4) DEFAULT 0,
    total_voids INTEGER DEFAULT 0,
    total_refunds INTEGER DEFAULT 0,
    void_amount NUMERIC(19,4) DEFAULT 0,
    refund_amount NUMERIC(19,4) DEFAULT 0,
    avg_transaction_value NUMERIC(19,4) DEFAULT 0,
    avg_transaction_seconds INTEGER DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, cashier_id, shift_date, till_code)
);

CREATE TABLE hourly_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    sale_date DATE NOT NULL,
    hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    transaction_count INTEGER DEFAULT 0,
    total_sales NUMERIC(19,4) DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, sale_date, hour_of_day)
);

CREATE TABLE lost_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    product_id UUID NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(300) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL,
    attempted_quantity NUMERIC(19,4) DEFAULT 1,
    unit_price NUMERIC(19,4),
    estimated_lost_revenue NUMERIC(19,4),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    cashier_id VARCHAR(200),
    till_code VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cashier_perf_tenant_date ON cashier_performance(tenant_id, shift_date);
CREATE INDEX idx_hourly_sales_tenant_date ON hourly_sales(tenant_id, sale_date);
CREATE INDEX idx_lost_sales_tenant ON lost_sales(tenant_id, attempted_at);

ALTER TABLE cashier_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_performance FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cashier_performance_tenant_policy ON cashier_performance;
CREATE POLICY cashier_performance_tenant_policy ON cashier_performance
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE hourly_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_sales FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hourly_sales_tenant_policy ON hourly_sales;
CREATE POLICY hourly_sales_tenant_policy ON hourly_sales
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE lost_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_sales FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lost_sales_tenant_policy ON lost_sales;
CREATE POLICY lost_sales_tenant_policy ON lost_sales
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
