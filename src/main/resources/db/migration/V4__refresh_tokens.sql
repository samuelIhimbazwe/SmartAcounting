CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    username VARCHAR(150) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant_user ON refresh_tokens (tenant_id, user_id);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refresh_tokens_tenant_policy ON refresh_tokens;
CREATE POLICY refresh_tokens_tenant_policy ON refresh_tokens
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
