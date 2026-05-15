CREATE TABLE IF NOT EXISTS notification_sms_delivery_log (
    id                      UUID PRIMARY KEY,
    tenant_id               UUID         NOT NULL,
    notification_event_id   UUID         NOT NULL,
    event_type              VARCHAR(80)  NOT NULL,
    recipient_phone         VARCHAR(40)  NOT NULL,
    status                  VARCHAR(24)  NOT NULL,
    response_code           INTEGER,
    error_message           TEXT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_log_tenant_created
    ON notification_sms_delivery_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_log_tenant_event
    ON notification_sms_delivery_log (tenant_id, notification_event_id, created_at DESC);

ALTER TABLE notification_sms_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_sms_delivery_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_sms_delivery_log_tenant_policy ON notification_sms_delivery_log;
CREATE POLICY notification_sms_delivery_log_tenant_policy ON notification_sms_delivery_log
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
