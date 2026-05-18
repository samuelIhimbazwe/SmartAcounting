CREATE TABLE till_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    till_id         UUID NOT NULL,
    pos_register_code VARCHAR(40) NOT NULL,
    cashier_id      UUID NOT NULL,
    shift_id        UUID,
    opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ,
    opening_float   NUMERIC(15,2) NOT NULL DEFAULT 0,
    closing_cash    NUMERIC(15,2),
    variance        NUMERIC(15,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN','CLOSED','SUSPENDED')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_till_sessions_open_per_register
    ON till_sessions(tenant_id, pos_register_code)
    WHERE status = 'OPEN';

CREATE INDEX idx_till_sessions_tenant_cashier
    ON till_sessions(tenant_id, cashier_id, status);

ALTER TABLE till_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE till_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS till_sessions_tenant_policy ON till_sessions;
CREATE POLICY till_sessions_tenant_policy ON till_sessions
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
