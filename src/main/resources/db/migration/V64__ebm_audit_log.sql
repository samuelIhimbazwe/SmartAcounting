CREATE TABLE IF NOT EXISTS ebm_audit_log (
    id               UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL,
    receipt_id       UUID,
    request_payload  TEXT,
    response_payload TEXT,
    status           VARCHAR(32) NOT NULL,
    sent_at          TIMESTAMPTZ,
    responded_at     TIMESTAMPTZ,
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ebm_audit_log_tenant ON ebm_audit_log (tenant_id, created_at DESC);

ALTER TABLE ebm_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY ebm_audit_log_tenant ON ebm_audit_log
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
