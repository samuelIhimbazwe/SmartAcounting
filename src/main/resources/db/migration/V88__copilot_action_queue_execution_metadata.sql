ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS permission_code VARCHAR(128);
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS preview_title VARCHAR(255);
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS preview_summary TEXT;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS warning_message TEXT;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS reversible BOOLEAN;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS undo_action_type VARCHAR(128);
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS undo_payload JSONB;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS result_entity_type VARCHAR(128);
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS result_entity_id UUID;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS result_summary TEXT;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS execution_error TEXT;

CREATE INDEX IF NOT EXISTS idx_action_queue_tenant_status_created
    ON action_queue (tenant_id, status, created_at DESC);
