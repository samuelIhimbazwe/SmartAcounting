CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    topic VARCHAR(160) NOT NULL,
    event_type VARCHAR(160) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created_at ON outbox_events (status, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_next_attempt ON outbox_events (status, next_attempt_at);

CREATE TABLE IF NOT EXISTS idempotency_records (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    route_key VARCHAR(160) NOT NULL,
    idempotency_key VARCHAR(160) NOT NULL,
    request_hash VARCHAR(128) NOT NULL,
    status VARCHAR(24) NOT NULL,
    response_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_idempotency_route_key UNIQUE (tenant_id, route_key, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_records (tenant_id, route_key, idempotency_key);
