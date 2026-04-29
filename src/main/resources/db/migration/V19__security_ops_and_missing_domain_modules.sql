ALTER TABLE tenants ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS service_account_api_keys (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    service_user_id UUID NOT NULL,
    service_account_name VARCHAR(160) NOT NULL,
    key_prefix VARCHAR(24) NOT NULL,
    key_hash VARCHAR(128) NOT NULL,
    scopes_csv TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_service_account_api_keys_prefix ON service_account_api_keys (key_prefix, active);
CREATE INDEX IF NOT EXISTS idx_service_account_api_keys_tenant ON service_account_api_keys (tenant_id, active);

CREATE TABLE IF NOT EXISTS forecast_jobs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    metric VARCHAR(120) NOT NULL,
    status VARCHAR(24) NOT NULL,
    result_json JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_forecast_jobs_tenant_created ON forecast_jobs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forecast_jobs_status_created ON forecast_jobs (status, created_at ASC);

CREATE TABLE IF NOT EXISTS hr_employee_profiles (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    full_name VARCHAR(180) NOT NULL,
    department VARCHAR(120) NOT NULL,
    title VARCHAR(120) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_employee_profiles_tenant_status ON hr_employee_profiles (tenant_id, status);

CREATE TABLE IF NOT EXISTS hr_leave_requests (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    leave_type VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_tenant_status ON hr_leave_requests (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    asset_name VARCHAR(180) NOT NULL,
    category VARCHAR(120) NOT NULL,
    acquisition_cost NUMERIC(18,2) NOT NULL,
    acquisition_date DATE NOT NULL,
    useful_life_months INT NOT NULL,
    residual_value NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_tenant_status ON fixed_assets (tenant_id, status);

CREATE TABLE IF NOT EXISTS document_files (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(120) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    storage_provider VARCHAR(40) NOT NULL,
    object_key VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'UPLOADED',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_files_entity ON document_files (tenant_id, entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tenant_data_sharing_grants (
    id UUID PRIMARY KEY,
    source_tenant_id UUID NOT NULL,
    target_tenant_id UUID NOT NULL,
    resource_type VARCHAR(120) NOT NULL,
    scope VARCHAR(120) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenant_sharing_source ON tenant_data_sharing_grants (source_tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_sharing_target ON tenant_data_sharing_grants (target_tenant_id, status);
