CREATE TABLE IF NOT EXISTS vat_filing_calendar (
    id               UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL,
    period           VARCHAR(16) NOT NULL,
    due_date         DATE NOT NULL,
    status           VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    submitted_at     TIMESTAMPTZ,
    reference_number VARCHAR(128),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, period)
);

CREATE INDEX IF NOT EXISTS idx_vat_filing_calendar_tenant ON vat_filing_calendar (tenant_id, due_date);

ALTER TABLE vat_filing_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY vat_filing_calendar_tenant ON vat_filing_calendar
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
