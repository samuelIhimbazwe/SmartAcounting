ALTER TABLE products
    ADD COLUMN IF NOT EXISTS barcode VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tenant_barcode
    ON products (tenant_id, barcode)
    WHERE barcode IS NOT NULL AND barcode <> '';
