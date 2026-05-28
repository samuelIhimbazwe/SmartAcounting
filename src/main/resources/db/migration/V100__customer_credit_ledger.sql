CREATE TABLE IF NOT EXISTS customer_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES finance_customers(id),
    entry_type VARCHAR(20) NOT NULL,
    amount NUMERIC(19,4) NOT NULL,
    running_balance NUMERIC(19,4),
    reference VARCHAR(120),
    notes TEXT,
    sales_order_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_credit_ledger_customer
    ON customer_credit_ledger (tenant_id, customer_id, created_at DESC);

ALTER TABLE customer_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_ledger FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_credit_ledger_tenant_policy ON customer_credit_ledger;
CREATE POLICY customer_credit_ledger_tenant_policy ON customer_credit_ledger
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
