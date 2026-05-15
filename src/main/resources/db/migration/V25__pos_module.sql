-- Point of Sale: catalog (barcode), sale lines, split tenders (cash / MoMo / card).

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS sales_channel VARCHAR(24) NOT NULL DEFAULT 'DIRECT';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS pos_register_code VARCHAR(40);

CREATE TABLE IF NOT EXISTS pos_catalog_items (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    barcode VARCHAR(64) NOT NULL,
    sku VARCHAR(64),
    display_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(18, 2) NOT NULL,
    currency_code VARCHAR(8) NOT NULL DEFAULT 'RWF',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pos_catalog_barcode UNIQUE (tenant_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_pos_catalog_tenant_active ON pos_catalog_items (tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_pos_catalog_barcode ON pos_catalog_items (tenant_id, barcode);

CREATE TABLE IF NOT EXISTS pos_sale_lines (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    sales_order_id UUID NOT NULL,
    catalog_item_id UUID,
    barcode_snapshot VARCHAR(64),
    product_name_snapshot VARCHAR(255) NOT NULL,
    quantity NUMERIC(18, 4) NOT NULL,
    unit_price NUMERIC(18, 2) NOT NULL,
    line_total NUMERIC(18, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_sale_lines_order ON pos_sale_lines (tenant_id, sales_order_id);

CREATE TABLE IF NOT EXISTS pos_payment_tenders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    sales_order_id UUID NOT NULL,
    tender_type VARCHAR(16) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    reference VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_tenders_order ON pos_payment_tenders (tenant_id, sales_order_id);

ALTER TABLE pos_sale_lines
    ADD CONSTRAINT fk_pos_sale_lines_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id) ON DELETE CASCADE;
ALTER TABLE pos_payment_tenders
    ADD CONSTRAINT fk_pos_payment_tenders_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id) ON DELETE CASCADE;

ALTER TABLE pos_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_catalog_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pos_catalog_items_tenant_policy ON pos_catalog_items;
CREATE POLICY pos_catalog_items_tenant_policy ON pos_catalog_items
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE pos_sale_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sale_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pos_sale_lines_tenant_policy ON pos_sale_lines;
CREATE POLICY pos_sale_lines_tenant_policy ON pos_sale_lines
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE pos_payment_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_payment_tenders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pos_payment_tenders_tenant_policy ON pos_payment_tenders;
CREATE POLICY pos_payment_tenders_tenant_policy ON pos_payment_tenders
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
