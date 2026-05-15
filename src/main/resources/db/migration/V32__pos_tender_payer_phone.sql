ALTER TABLE pos_payment_tenders
    ADD COLUMN IF NOT EXISTS payer_phone VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_pos_tenders_tenant_phone
    ON pos_payment_tenders (tenant_id, payer_phone)
    WHERE payer_phone IS NOT NULL AND payer_phone <> '';
