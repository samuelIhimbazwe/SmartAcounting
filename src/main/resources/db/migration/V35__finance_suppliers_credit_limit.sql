CREATE TABLE IF NOT EXISTS finance_suppliers (
    id                UUID PRIMARY KEY,
    tenant_id         UUID NOT NULL,
    supplier_name     VARCHAR(255) NOT NULL,
    credit_limit      NUMERIC(20,4) NOT NULL DEFAULT 0,
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_suppliers_tenant_name
    ON finance_suppliers (tenant_id, lower(supplier_name));

CREATE INDEX IF NOT EXISTS idx_finance_suppliers_tenant
    ON finance_suppliers (tenant_id);

ALTER TABLE supplier_bills
    ADD COLUMN IF NOT EXISTS supplier_id UUID;

CREATE INDEX IF NOT EXISTS idx_supplier_bills_tenant_supplier
    ON supplier_bills (tenant_id, supplier_id, created_at);

ALTER TABLE finance_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_suppliers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_suppliers_tenant_policy ON finance_suppliers;
CREATE POLICY finance_suppliers_tenant_policy ON finance_suppliers
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
