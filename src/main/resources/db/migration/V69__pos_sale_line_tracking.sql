ALTER TABLE pos_sale_lines
    ADD COLUMN IF NOT EXISTS product_id_snapshot UUID,
    ADD COLUMN IF NOT EXISTS variant_id UUID,
    ADD COLUMN IF NOT EXISTS serial_number VARCHAR(128),
    ADD COLUMN IF NOT EXISTS lot_code VARCHAR(64);
