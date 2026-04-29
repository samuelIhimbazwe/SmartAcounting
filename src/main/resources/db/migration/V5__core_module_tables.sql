CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    entry_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    debit_account VARCHAR(120) NOT NULL,
    credit_account VARCHAR(120) NOT NULL,
    amount NUMERIC(20, 4) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date ON journal_entries (tenant_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS workflow_rules (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(160) NOT NULL,
    trigger_event VARCHAR(120) NOT NULL,
    conditions_json JSONB NOT NULL,
    actions_json JSONB NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_tenant_trigger ON workflow_rules (tenant_id, trigger_event);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS journal_entries_tenant_policy ON journal_entries;
CREATE POLICY journal_entries_tenant_policy ON journal_entries
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workflow_rules_tenant_policy ON workflow_rules;
CREATE POLICY workflow_rules_tenant_policy ON workflow_rules
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
