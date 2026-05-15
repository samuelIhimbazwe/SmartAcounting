CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    promotion_type VARCHAR(50) NOT NULL,
    discount_value NUMERIC(10,4),
    bundle_price NUMERIC(19,4),
    buy_quantity INTEGER,
    get_quantity INTEGER,
    applies_to VARCHAR(50) NOT NULL DEFAULT 'ALL_PRODUCTS',
    category VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    minimum_purchase NUMERIC(19,4) DEFAULT 0,
    maximum_discount NUMERIC(19,4),
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE promotion_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    promotion_id UUID NOT NULL REFERENCES promotions(id),
    product_id UUID NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(300) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE promotion_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    promotion_id UUID NOT NULL REFERENCES promotions(id),
    pos_transaction_id VARCHAR(200) NOT NULL,
    discount_applied NUMERIC(19,4) NOT NULL,
    original_amount NUMERIC(19,4) NOT NULL,
    final_amount NUMERIC(19,4) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promotions_tenant_status_dates ON promotions(tenant_id, status, start_date, end_date);
CREATE INDEX idx_promotion_products_promotion ON promotion_products(promotion_id);
CREATE INDEX idx_promotion_results_promotion ON promotion_results(tenant_id, promotion_id);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS promotions_tenant_policy ON promotions;
CREATE POLICY promotions_tenant_policy ON promotions
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS promotion_products_tenant_policy ON promotion_products;
CREATE POLICY promotion_products_tenant_policy ON promotion_products
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE promotion_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_results FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS promotion_results_tenant_policy ON promotion_results;
CREATE POLICY promotion_results_tenant_policy ON promotion_results
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
