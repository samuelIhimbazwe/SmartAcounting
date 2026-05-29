CREATE TABLE ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_code VARCHAR(120) NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(32) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_ledger_accounts_tenant_code ON ledger_accounts (tenant_id, account_code);
CREATE INDEX idx_ledger_accounts_tenant_active ON ledger_accounts (tenant_id, active, account_code);

INSERT INTO ledger_accounts (id, tenant_id, account_code, account_name, account_type, active)
SELECT gen_random_uuid(), t.id, d.code, d.name, d.type, TRUE
FROM tenants t
CROSS JOIN (VALUES
    ('1010-CASH',      'Cash on hand',               'ASSET'),
    ('1020-BANK-MOMO', 'Mobile money bank',          'ASSET'),
    ('1030-AR-CTRL',   'Accounts receivable control', 'ASSET'),
    ('1100-AR',        'Accounts receivable',        'ASSET'),
    ('1300-INVENTORY', 'Inventory',                  'ASSET'),
    ('1500-ACC-DEP',   'Accumulated depreciation',   'ASSET'),
    ('2000-AP',        'Accounts payable',           'LIABILITY'),
    ('4000-SALES',     'Sales revenue',              'REVENUE'),
    ('5100-PAYROLL',   'Payroll expense',            'EXPENSE'),
    ('5400-DEPREC',    'Depreciation expense',       'EXPENSE')
) AS d(code, name, type)
ON CONFLICT (tenant_id, account_code) DO NOTHING;

ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_accounts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ledger_accounts_tenant_policy ON ledger_accounts;
CREATE POLICY ledger_accounts_tenant_policy ON ledger_accounts
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
