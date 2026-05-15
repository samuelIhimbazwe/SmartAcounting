ALTER TABLE sync_queue
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120),
    ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_queue_tenant_device_idempotency
    ON sync_queue (tenant_id, device_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';
