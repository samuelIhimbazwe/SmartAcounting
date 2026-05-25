-- Tenant-defined permissions (CEO / role designer). Platform rows keep tenant_id NULL.
ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE permissions
    ADD COLUMN IF NOT EXISTS grants_platform_codes JSONB;

-- Replace global-only unique code with platform + per-tenant uniqueness.
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_permissions_platform_code
    ON permissions (code)
    WHERE tenant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_permissions_tenant_code
    ON permissions (tenant_id, code)
    WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_permissions_tenant_id ON permissions (tenant_id);
