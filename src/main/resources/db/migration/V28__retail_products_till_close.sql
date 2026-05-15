-- Retail product master (UUID referenced by pos_catalog_items.product_id and inventory_balances.product_id)
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY,
    tenant_id       UUID         NOT NULL,
    name            VARCHAR(255) NOT NULL,
    sku             VARCHAR(64),
    unit            VARCHAR(32),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products (tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_sku ON products (tenant_id, sku);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_tenant_policy ON products;
CREATE POLICY products_tenant_policy ON products
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- End-of-day till reconciliation (counted vs system by tender bucket)
CREATE TABLE IF NOT EXISTS pos_till_closes (
    id                     UUID PRIMARY KEY,
    tenant_id              UUID         NOT NULL,
    business_date          DATE         NOT NULL,
    pos_register_code      VARCHAR(40)  NOT NULL,
    counted_cash           NUMERIC(18, 2) NOT NULL,
    counted_momo           NUMERIC(18, 2) NOT NULL,
    counted_airtel         NUMERIC(18, 2) NOT NULL,
    counted_card           NUMERIC(18, 2) NOT NULL,
    counted_on_account     NUMERIC(18, 2) NOT NULL DEFAULT 0,
    system_cash            NUMERIC(18, 2) NOT NULL,
    system_momo            NUMERIC(18, 2) NOT NULL,
    system_airtel          NUMERIC(18, 2) NOT NULL,
    system_card            NUMERIC(18, 2) NOT NULL,
    system_on_account      NUMERIC(18, 2) NOT NULL DEFAULT 0,
    variance_cash          NUMERIC(18, 2) NOT NULL,
    variance_momo          NUMERIC(18, 2) NOT NULL,
    variance_airtel        NUMERIC(18, 2) NOT NULL,
    variance_card          NUMERIC(18, 2) NOT NULL,
    variance_on_account    NUMERIC(18, 2) NOT NULL DEFAULT 0,
    notes                  TEXT,
    closed_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pos_till_close UNIQUE (tenant_id, business_date, pos_register_code)
);

CREATE INDEX IF NOT EXISTS idx_pos_till_close_tenant ON pos_till_closes (tenant_id, business_date DESC);

ALTER TABLE pos_till_closes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_till_closes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pos_till_closes_tenant_policy ON pos_till_closes;
CREATE POLICY pos_till_closes_tenant_policy ON pos_till_closes
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
