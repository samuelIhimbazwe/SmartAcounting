CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    customer_name VARCHAR(180) NOT NULL,
    amount NUMERIC(20,4) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_bills (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    supplier_name VARCHAR(180) NOT NULL,
    amount NUMERIC(20,4) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS close_tasks (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    period VARCHAR(20) NOT NULL,
    task_key VARCHAR(120) NOT NULL,
    owner_role VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL,
    depends_on_json JSONB,
    risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_due ON invoices (tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_tenant_due ON supplier_bills (tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_close_tasks_tenant_period ON close_tasks (tenant_id, period);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_tenant_policy ON invoices;
CREATE POLICY invoices_tenant_policy ON invoices
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE supplier_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bills FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_bills_tenant_policy ON supplier_bills;
CREATE POLICY supplier_bills_tenant_policy ON supplier_bills
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE close_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS close_tasks_tenant_policy ON close_tasks;
CREATE POLICY close_tasks_tenant_policy ON close_tasks
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
