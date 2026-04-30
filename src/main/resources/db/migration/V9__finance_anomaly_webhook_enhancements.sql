ALTER TABLE webhook_delivery_log
    ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS signature VARCHAR(128);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    direction VARCHAR(10) NOT NULL, -- IN / OUT
    counterparty VARCHAR(180) NOT NULL,
    amount NUMERIC(20,4) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    account_code VARCHAR(80) NOT NULL,
    period VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    variance_amount NUMERIC(20,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anomaly_cases (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    affected_role VARCHAR(80) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(240) NOT NULL,
    details TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_tenant_policy ON payments;
CREATE POLICY payments_tenant_policy ON payments
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reconciliations_tenant_policy ON reconciliations;
CREATE POLICY reconciliations_tenant_policy ON reconciliations
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE anomaly_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_cases FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anomaly_cases_tenant_policy ON anomaly_cases;
CREATE POLICY anomaly_cases_tenant_policy ON anomaly_cases
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
