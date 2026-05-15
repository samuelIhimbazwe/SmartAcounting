-- Link POS catalog lines to inventory products and optional reorder point (low-stock threshold).

ALTER TABLE pos_catalog_items
    ADD COLUMN IF NOT EXISTS product_id UUID,
    ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(18, 4);

COMMENT ON COLUMN pos_catalog_items.product_id IS 'Inventory product UUID; when set, POS checkout deducts stock from default retail location.';
COMMENT ON COLUMN pos_catalog_items.reorder_point IS 'Optional min qty at retail location; LOW_STOCK event when on-hand <= this value after a sale.';
