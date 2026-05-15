CREATE TABLE ebm_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pos_transaction_id VARCHAR(200) NOT NULL,
    ebm_receipt_number VARCHAR(100),
    ebm_signature VARCHAR(500),
    invoice_number VARCHAR(100),
    transaction_date TIMESTAMPTZ NOT NULL,
    net_amount NUMERIC(19,4) NOT NULL,
    vat_amount NUMERIC(19,4) NOT NULL,
    gross_amount NUMERIC(19,4) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'RWF',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    submitted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ebm_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
    ebm_tin VARCHAR(20) NOT NULL,
    ebm_device_serial VARCHAR(100) NOT NULL,
    ebm_api_url VARCHAR(300) NOT NULL,
    ebm_api_key VARCHAR(300),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ebm_receipts_tenant_status ON ebm_receipts(tenant_id, status);
CREATE INDEX idx_ebm_receipts_pos_transaction ON ebm_receipts(tenant_id, pos_transaction_id);

ALTER TABLE ebm_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebm_receipts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ebm_receipts_tenant_policy ON ebm_receipts;
CREATE POLICY ebm_receipts_tenant_policy ON ebm_receipts
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE ebm_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebm_config FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ebm_config_tenant_policy ON ebm_config;
CREATE POLICY ebm_config_tenant_policy ON ebm_config
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
