CREATE TABLE tenant_setup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    business_size VARCHAR(20) NOT NULL,
    business_type VARCHAR(20) NOT NULL,
    selected_roles JSONB,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
