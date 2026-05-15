CREATE TABLE IF NOT EXISTS inventory_batches (
    id               UUID PRIMARY KEY,
    tenant_id        UUID          NOT NULL,
    product_id       UUID          NOT NULL,
    location_code    VARCHAR(120)  NOT NULL,
    lot_code         VARCHAR(80),
    expiry_date      DATE,
    quantity_on_hand NUMERIC(20,4) NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_tenant_prod_loc_exp
    ON inventory_batches (tenant_id, product_id, location_code, expiry_date, created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_tenant_lot
    ON inventory_batches (tenant_id, lot_code);

ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_batches_tenant_policy ON inventory_batches;
CREATE POLICY inventory_batches_tenant_policy ON inventory_batches
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
