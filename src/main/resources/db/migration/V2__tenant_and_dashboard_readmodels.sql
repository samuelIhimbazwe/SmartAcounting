CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    username VARCHAR(150) NOT NULL,
    role VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users (tenant_id, role);

CREATE TABLE IF NOT EXISTS ceo_kpi_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS cfo_financial_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS sales_pipeline_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS ops_efficiency_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS hr_workforce_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS marketing_roi_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS accounting_close_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS anomaly_detection_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    affected_role VARCHAR(80) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_feed_tenant_role_created ON anomaly_detection_feed (tenant_id, affected_role, created_at DESC);
