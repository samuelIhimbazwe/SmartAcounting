CREATE TABLE IF NOT EXISTS finance_customers (
    id            UUID PRIMARY KEY,
    tenant_id     UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    credit_limit  NUMERIC(20,4) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_customers_tenant_name
    ON finance_customers (tenant_id, lower(customer_name));

CREATE INDEX IF NOT EXISTS idx_finance_customers_tenant
    ON finance_customers (tenant_id);

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS customer_id UUID;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_customer
    ON invoices (tenant_id, customer_id, created_at);

ALTER TABLE finance_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_customers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_customers_tenant_policy ON finance_customers;
CREATE POLICY finance_customers_tenant_policy ON finance_customers
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
