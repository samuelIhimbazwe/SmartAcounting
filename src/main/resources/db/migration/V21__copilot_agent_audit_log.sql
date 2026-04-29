CREATE TABLE IF NOT EXISTS copilot_agent_audit_log (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    run_id UUID NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    payload_json JSONB NOT NULL,
    previous_hash CHAR(64) NOT NULL,
    record_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copilot_agent_audit_tenant_created
    ON copilot_agent_audit_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_copilot_agent_audit_run_created
    ON copilot_agent_audit_log (run_id, created_at ASC);
