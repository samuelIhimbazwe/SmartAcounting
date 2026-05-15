-- POS mobile money auto-reconciliation: tender status + idempotent webhook dedup.

ALTER TABLE pos_payment_tenders
    ALTER COLUMN tender_type TYPE VARCHAR(24);

ALTER TABLE pos_payment_tenders
    ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(16) NOT NULL DEFAULT 'NA',
    ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reconciliation_source VARCHAR(40);

COMMENT ON COLUMN pos_payment_tenders.reconciliation_status IS 'NA | PENDING | MATCHED | MISMATCH';

CREATE INDEX IF NOT EXISTS idx_pos_tenders_tenant_ref
    ON pos_payment_tenders (tenant_id, reference)
    WHERE reference IS NOT NULL AND reference <> '';

CREATE TABLE IF NOT EXISTS mobile_money_settlement_dedup (
    id                   UUID PRIMARY KEY,
    tenant_id            UUID         NOT NULL,
    provider             VARCHAR(8)   NOT NULL,
    external_id          VARCHAR(120) NOT NULL,
    outcome              VARCHAR(16)  NOT NULL,
    response_json        TEXT         NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_mm_settlement_dedup UNIQUE (tenant_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_mm_dedup_tenant ON mobile_money_settlement_dedup (tenant_id, created_at);

ALTER TABLE mobile_money_settlement_dedup ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_money_settlement_dedup FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mobile_money_settlement_dedup_tenant_policy ON mobile_money_settlement_dedup;
CREATE POLICY mobile_money_settlement_dedup_tenant_policy ON mobile_money_settlement_dedup
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
