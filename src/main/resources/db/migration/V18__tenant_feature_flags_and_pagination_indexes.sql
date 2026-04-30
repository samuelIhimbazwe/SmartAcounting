CREATE TABLE IF NOT EXISTS tenant_feature_flags (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    feature_key VARCHAR(120) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_feature_flag UNIQUE (tenant_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_tenant ON tenant_feature_flags (tenant_id, feature_key);
CREATE INDEX IF NOT EXISTS idx_notification_events_created ON notification_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_rules_created ON notification_rules (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_queue_status_created ON action_queue (status, created_at ASC);
