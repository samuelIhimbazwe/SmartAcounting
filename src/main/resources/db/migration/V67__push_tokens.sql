CREATE TABLE device_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL,
    app_version VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, platform)
);

CREATE INDEX idx_push_tokens_tenant_user
    ON device_push_tokens(tenant_id, user_id);
CREATE INDEX idx_push_tokens_active
    ON device_push_tokens(tenant_id, is_active);
