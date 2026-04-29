CREATE TABLE IF NOT EXISTS copilot_agent_runs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(80) NOT NULL,
    question TEXT NOT NULL,
    prompt_version VARCHAR(80) NOT NULL,
    status VARCHAR(24) NOT NULL,
    plan_json JSONB,
    response_json JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_copilot_agent_runs_tenant_created
    ON copilot_agent_runs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS copilot_agent_steps (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES copilot_agent_runs(id) ON DELETE CASCADE,
    step_no INT NOT NULL,
    step_type VARCHAR(80) NOT NULL,
    status VARCHAR(24) NOT NULL,
    detail_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copilot_agent_steps_run_step
    ON copilot_agent_steps (run_id, step_no);
