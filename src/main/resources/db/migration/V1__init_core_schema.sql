CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50),
    entity_type VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    previous_hash CHAR(64) NOT NULL,
    record_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created_at ON audit_log (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    device_id UUID NOT NULL,
    operation_type VARCHAR(50),
    entity_type VARCHAR(100),
    payload JSONB NOT NULL,
    lamport_clock BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    conflict_policy VARCHAR(50) DEFAULT 'LAST_WRITE_WINS',
    synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_tenant_status ON sync_queue (tenant_id, status);

CREATE TABLE IF NOT EXISTS tenant_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    options JSONB,
    required BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS event_log (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_log_tenant_created_at ON event_log (tenant_id, created_at DESC);
