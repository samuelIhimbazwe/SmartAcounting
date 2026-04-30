CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    role VARCHAR(80) NOT NULL,
    format VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    download_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    subscription_id UUID NOT NULL,
    event_type VARCHAR(120) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL,
    response_code INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS export_jobs_tenant_policy ON export_jobs;
CREATE POLICY export_jobs_tenant_policy ON export_jobs
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE webhook_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_delivery_log_tenant_policy ON webhook_delivery_log;
CREATE POLICY webhook_delivery_log_tenant_policy ON webhook_delivery_log
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
