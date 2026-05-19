-- Phase 2: customer profiles, price lists, loyalty, layaway, quotes

ALTER TABLE finance_customers
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tin_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) NOT NULL DEFAULT 'RETAIL',
    ADD COLUMN IF NOT EXISTS price_list_id UUID,
    ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(20,4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_finance_customers_tenant_phone
    ON finance_customers (tenant_id, phone) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(200) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    discount_pct NUMERIC(8,4),
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS price_list_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    variant_id UUID,
    unit_price NUMERIC(19,4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_list_lines_list
    ON price_list_lines (price_list_id, product_id);

ALTER TABLE promotions
    ADD COLUMN IF NOT EXISTS conditions_json JSONB,
    ADD COLUMN IF NOT EXISTS reward_json JSONB,
    ADD COLUMN IF NOT EXISTS allow_stack BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS customer_loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES finance_customers(id),
    transaction_type VARCHAR(20) NOT NULL,
    points INTEGER NOT NULL,
    amount_rwf NUMERIC(19,4),
    sales_order_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_customer
    ON customer_loyalty_transactions (tenant_id, customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS layaway_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES finance_customers(id),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    total_amount NUMERIC(19,4) NOT NULL,
    deposit_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
    balance_due NUMERIC(19,4) NOT NULL,
    collection_date DATE,
    cart_json JSONB NOT NULL,
    sales_order_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS layaway_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    layaway_id UUID NOT NULL REFERENCES layaway_orders(id) ON DELETE CASCADE,
    amount NUMERIC(19,4) NOT NULL,
    tender_type VARCHAR(30) NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID REFERENCES finance_customers(id),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    total_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
    expiry_date DATE,
    cart_json JSONB NOT NULL,
    converted_sales_order_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_lists_tenant_policy ON price_lists;
CREATE POLICY price_lists_tenant_policy ON price_lists
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE price_list_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_list_lines_tenant_policy ON price_list_lines;
CREATE POLICY price_list_lines_tenant_policy ON price_list_lines
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE customer_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty_transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS loyalty_tx_tenant_policy ON customer_loyalty_transactions;
CREATE POLICY loyalty_tx_tenant_policy ON customer_loyalty_transactions
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE layaway_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE layaway_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS layaway_orders_tenant_policy ON layaway_orders;
CREATE POLICY layaway_orders_tenant_policy ON layaway_orders
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE layaway_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE layaway_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS layaway_payments_tenant_policy ON layaway_payments;
CREATE POLICY layaway_payments_tenant_policy ON layaway_payments
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE sales_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_quotes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_quotes_tenant_policy ON sales_quotes;
CREATE POLICY sales_quotes_tenant_policy ON sales_quotes
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
