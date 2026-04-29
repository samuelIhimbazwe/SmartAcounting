CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    supplier_name VARCHAR(180) NOT NULL,
    status VARCHAR(40) NOT NULL,
    total_amount NUMERIC(20,4) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_created ON purchase_orders (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    customer_name VARCHAR(180) NOT NULL,
    status VARCHAR(40) NOT NULL,
    total_amount NUMERIC(20,4) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant_created ON sales_orders (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    callback_url VARCHAR(500) NOT NULL,
    event_type VARCHAR(120) NOT NULL,
    secret VARCHAR(200) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fx_rates (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    base_currency CHAR(3) NOT NULL,
    quote_currency CHAR(3) NOT NULL,
    rate NUMERIC(18,8) NOT NULL,
    source VARCHAR(120) NOT NULL,
    as_of_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_plugins (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    plugin_key VARCHAR(120) NOT NULL,
    version VARCHAR(40) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_orders_tenant_policy ON purchase_orders;
CREATE POLICY purchase_orders_tenant_policy ON purchase_orders
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_orders_tenant_policy ON sales_orders;
CREATE POLICY sales_orders_tenant_policy ON sales_orders
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_subscriptions_tenant_policy ON webhook_subscriptions;
CREATE POLICY webhook_subscriptions_tenant_policy ON webhook_subscriptions
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_rates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fx_rates_tenant_policy ON fx_rates;
CREATE POLICY fx_rates_tenant_policy ON fx_rates
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE tenant_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_plugins FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_plugins_tenant_policy ON tenant_plugins;
CREATE POLICY tenant_plugins_tenant_policy ON tenant_plugins
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
