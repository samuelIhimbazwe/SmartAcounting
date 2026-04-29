ALTER TABLE refresh_tokens
    ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_used ON refresh_tokens (expires_at, used, used_at);

CREATE TABLE IF NOT EXISTS scenario_executions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    scenario_id UUID NOT NULL,
    role VARCHAR(80) NOT NULL,
    output_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scenario_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_executions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scenario_executions_tenant_policy ON scenario_executions;
CREATE POLICY scenario_executions_tenant_policy ON scenario_executions
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
