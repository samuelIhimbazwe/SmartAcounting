CREATE TABLE customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID,
    customer_name VARCHAR(300) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(200),
    segment VARCHAR(50) NOT NULL DEFAULT 'OCCASIONAL',
    total_spend NUMERIC(19,4) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    avg_order_value NUMERIC(19,4) DEFAULT 0,
    last_purchase_date DATE,
    days_since_purchase INTEGER,
    rfm_recency_score INTEGER DEFAULT 0,
    rfm_frequency_score INTEGER DEFAULT 0,
    rfm_monetary_score INTEGER DEFAULT 0,
    rfm_total_score INTEGER DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    last_segmented_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, customer_name)
);

CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(200) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    message_template TEXT NOT NULL,
    target_segment VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    budget NUMERIC(19,4),
    actual_cost NUMERIC(19,4) DEFAULT 0,
    recipient_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    attributed_revenue NUMERIC(19,4) DEFAULT 0,
    attribution_window_days INTEGER DEFAULT 7,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id),
    customer_name VARCHAR(300) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    personalised_message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_segments_tenant ON customer_segments(tenant_id, segment);
CREATE INDEX idx_campaigns_tenant_status ON marketing_campaigns(tenant_id, status);
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id, status);

ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_segments_tenant_policy ON customer_segments;
CREATE POLICY customer_segments_tenant_policy ON customer_segments
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_campaigns_tenant_policy ON marketing_campaigns;
CREATE POLICY marketing_campaigns_tenant_policy ON marketing_campaigns
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_recipients_tenant_policy ON campaign_recipients;
CREATE POLICY campaign_recipients_tenant_policy ON campaign_recipients
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
