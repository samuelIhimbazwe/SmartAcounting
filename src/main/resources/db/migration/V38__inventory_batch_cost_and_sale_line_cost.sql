ALTER TABLE inventory_batches
    ADD COLUMN IF NOT EXISTS cost_price NUMERIC(18,2);

ALTER TABLE pos_sale_lines
    ADD COLUMN IF NOT EXISTS inventory_batch_id UUID;

ALTER TABLE pos_sale_lines
    ADD COLUMN IF NOT EXISTS cost_price NUMERIC(18,2);

CREATE INDEX IF NOT EXISTS idx_pos_sale_lines_batch
    ON pos_sale_lines (tenant_id, inventory_batch_id);
