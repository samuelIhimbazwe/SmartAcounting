ALTER TABLE price_lists
    ADD COLUMN IF NOT EXISTS list_type VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN IF NOT EXISTS min_order_qty INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_finance_customers_price_list
    ON finance_customers (tenant_id, price_list_id)
    WHERE deleted_at IS NULL AND price_list_id IS NOT NULL;
