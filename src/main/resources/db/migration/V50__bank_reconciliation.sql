CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    current_balance NUMERIC(19,4) DEFAULT 0,
    last_statement_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE bank_statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    filename VARCHAR(300) NOT NULL,
    imported_by UUID NOT NULL,
    line_count INTEGER NOT NULL DEFAULT 0,
    matched_count INTEGER NOT NULL DEFAULT 0,
    unmatched_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bank_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    transaction_date DATE NOT NULL,
    value_date DATE,
    description VARCHAR(500),
    reference VARCHAR(200),
    debit_amount NUMERIC(19,4),
    credit_amount NUMERIC(19,4),
    balance NUMERIC(19,4),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    status VARCHAR(30) NOT NULL DEFAULT 'UNMATCHED',
    matched_journal_id UUID,
    matched_at TIMESTAMPTZ,
    import_batch_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_statement_lines_tenant ON bank_statement_lines(tenant_id);
CREATE INDEX idx_bank_statement_lines_status ON bank_statement_lines(tenant_id, status);
CREATE INDEX idx_bank_statement_lines_date ON bank_statement_lines(tenant_id, transaction_date);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_accounts_tenant_policy ON bank_accounts;
CREATE POLICY bank_accounts_tenant_policy ON bank_accounts
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_statement_lines_tenant_policy ON bank_statement_lines;
CREATE POLICY bank_statement_lines_tenant_policy ON bank_statement_lines
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_imports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_statement_imports_tenant_policy ON bank_statement_imports;
CREATE POLICY bank_statement_imports_tenant_policy ON bank_statement_imports
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
