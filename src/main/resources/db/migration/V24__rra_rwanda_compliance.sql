-- Rwanda Revenue Authority (RRA) EIS / EBM compliance: settings, per-invoice submissions, tax filings.
-- RRA real-time EIS API credentials and exact payload schemas are environment-specific; the app stores
-- audit rows and uses configurable HTTP endpoints (see smartaccounting.rra.rwanda.*).

CREATE TABLE IF NOT EXISTS rra_rwanda_settings (
    tenant_id UUID PRIMARY KEY,
    tin VARCHAR(32),
    company_trade_name VARCHAR(255),
    vat_registered BOOLEAN NOT NULL DEFAULT FALSE,
    turnover_exceeds_vat_threshold BOOLEAN NOT NULL DEFAULT FALSE,
    amounts_tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    eis_integration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rra_eis_submissions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    status VARCHAR(24) NOT NULL,
    request_payload TEXT,
    response_payload TEXT,
    rra_reference VARCHAR(120),
    error_message TEXT,
    http_status INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rra_eis_tenant_invoice ON rra_eis_submissions (tenant_id, invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rra_eis_tenant_status ON rra_eis_submissions (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS rra_tax_filings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    filing_type VARCHAR(16) NOT NULL,
    period VARCHAR(7) NOT NULL,
    status VARCHAR(24) NOT NULL,
    due_date DATE,
    draft_payload TEXT,
    submitted_payload TEXT,
    rra_ack_reference VARCHAR(120),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    CONSTRAINT uq_rra_tax_filing UNIQUE (tenant_id, filing_type, period)
);

CREATE INDEX IF NOT EXISTS idx_rra_tax_filings_tenant_period ON rra_tax_filings (tenant_id, period);

ALTER TABLE rra_rwanda_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rra_rwanda_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rra_rwanda_settings_tenant_policy ON rra_rwanda_settings;
CREATE POLICY rra_rwanda_settings_tenant_policy ON rra_rwanda_settings
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE rra_eis_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rra_eis_submissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rra_eis_submissions_tenant_policy ON rra_eis_submissions;
CREATE POLICY rra_eis_submissions_tenant_policy ON rra_eis_submissions
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE rra_tax_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rra_tax_filings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rra_tax_filings_tenant_policy ON rra_tax_filings;
CREATE POLICY rra_tax_filings_tenant_policy ON rra_tax_filings
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
