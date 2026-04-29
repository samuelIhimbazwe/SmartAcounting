ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS approval_status VARCHAR(24);
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS approval_expires_at TIMESTAMPTZ;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS approval_decided_by UUID;
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS approval_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_action_queue_approval_status
    ON action_queue (tenant_id, approval_status, approval_expires_at);
