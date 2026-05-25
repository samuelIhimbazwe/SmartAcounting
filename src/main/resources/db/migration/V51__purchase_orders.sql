ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS po_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS supplier_id UUID,
    ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
    ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS sent_via VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS approved_by UUID,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE purchase_orders NO FORCE ROW LEVEL SECURITY;

UPDATE purchase_orders
SET po_number = 'PO-' || replace(id::text, '-', '')
WHERE po_number IS NULL;

ALTER TABLE purchase_orders ALTER COLUMN po_number SET NOT NULL;

ALTER TABLE purchase_orders FORCE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_tenant_po_number
    ON purchase_orders (tenant_id, po_number);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    product_id UUID NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(300) NOT NULL,
    ordered_quantity NUMERIC(19,4) NOT NULL,
    received_quantity NUMERIC(19,4) DEFAULT 0,
    unit_cost NUMERIC(19,4) NOT NULL,
    total_cost NUMERIC(19,4) NOT NULL,
    unit_of_measure VARCHAR(50) DEFAULT 'UNIT',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goods_received_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    grn_number VARCHAR(50) NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(200) NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_grn_tenant_number UNIQUE (tenant_id, grn_number)
);

CREATE TABLE IF NOT EXISTS grn_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    grn_id UUID NOT NULL REFERENCES goods_received_notes(id),
    po_line_id UUID REFERENCES purchase_order_lines(id),
    product_id UUID NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(300) NOT NULL,
    expected_quantity NUMERIC(19,4),
    received_quantity NUMERIC(19,4) NOT NULL,
    rejected_quantity NUMERIC(19,4) DEFAULT 0,
    unit_cost NUMERIC(19,4) NOT NULL,
    lot_code VARCHAR(100),
    expiry_date DATE,
    location VARCHAR(100) DEFAULT 'SHOP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_supplier_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    product_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    lead_time_days INTEGER DEFAULT 3,
    preferred BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_supplier_pref UNIQUE (tenant_id, product_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_status
    ON purchase_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_grn_tenant ON goods_received_notes(tenant_id);

ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_order_lines_tenant_policy ON purchase_order_lines;
CREATE POLICY purchase_order_lines_tenant_policy ON purchase_order_lines
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS goods_received_notes_tenant_policy ON goods_received_notes;
CREATE POLICY goods_received_notes_tenant_policy ON goods_received_notes
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE grn_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grn_lines_tenant_policy ON grn_lines;
CREATE POLICY grn_lines_tenant_policy ON grn_lines
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE product_supplier_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_supplier_preferences FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_supplier_preferences_tenant_policy ON product_supplier_preferences;
CREATE POLICY product_supplier_preferences_tenant_policy ON product_supplier_preferences
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
