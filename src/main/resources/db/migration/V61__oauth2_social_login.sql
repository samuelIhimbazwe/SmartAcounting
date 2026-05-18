-- OAuth2 authorization-code social login (Google / Microsoft) — additive to users.oauth_* columns

CREATE TABLE IF NOT EXISTS social_identities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    user_id             UUID NOT NULL,
    provider            VARCHAR(50) NOT NULL,
    provider_subject    VARCHAR(300) NOT NULL,
    email               VARCHAR(300) NOT NULL,
    display_name        VARCHAR(300),
    avatar_url          VARCHAR(500),
    access_token        TEXT,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_social_identities_user
    ON social_identities (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_social_identities_email
    ON social_identities (provider, lower(email));

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) NOT NULL DEFAULT 'LOCAL';

ALTER TABLE social_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_identities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_identities_tenant_policy ON social_identities;
CREATE POLICY social_identities_tenant_policy ON social_identities
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
