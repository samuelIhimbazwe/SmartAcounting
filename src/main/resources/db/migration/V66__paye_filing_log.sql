CREATE TABLE IF NOT EXISTS paye_filing_log (
    id               UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL,
    payroll_run_id   UUID NOT NULL,
    file_format      VARCHAR(16) NOT NULL DEFAULT 'RRA_CSV',
    status           VARCHAR(32) NOT NULL,
    row_count        INT,
    submitted_at     TIMESTAMPTZ,
    reference_number VARCHAR(128),
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paye_filing_log_run ON paye_filing_log (tenant_id, payroll_run_id);

ALTER TABLE paye_filing_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY paye_filing_log_tenant ON paye_filing_log
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
