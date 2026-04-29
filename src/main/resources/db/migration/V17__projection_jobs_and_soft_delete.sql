CREATE TABLE IF NOT EXISTS projection_rebuild_jobs (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(24) NOT NULL,
    from_ts TIMESTAMPTZ,
    to_ts TIMESTAMPTZ,
    details_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_projection_rebuild_jobs_started_at ON projection_rebuild_jobs (started_at DESC);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE supplier_bills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_not_deleted ON invoices (tenant_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_not_deleted ON supplier_bills (tenant_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_journal_entries_not_deleted ON journal_entries (tenant_id, deleted_at);
