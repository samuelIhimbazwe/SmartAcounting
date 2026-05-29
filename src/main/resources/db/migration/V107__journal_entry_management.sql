ALTER TABLE journal_entries
    ADD COLUMN IF NOT EXISTS reference_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'POSTED',
    ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS posted_by UUID,
    ADD COLUMN IF NOT EXISTS reversed_from_id UUID,
    ADD COLUMN IF NOT EXISTS lines_json JSONB;

UPDATE journal_entries
SET status = 'POSTED',
    posted_at = COALESCE(posted_at, created_at),
    reference_number = COALESCE(reference_number, 'JE-LEGACY-' || SUBSTRING(id::text, 1, 8))
WHERE reference_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_status
    ON journal_entries (tenant_id, status, entry_date DESC);
