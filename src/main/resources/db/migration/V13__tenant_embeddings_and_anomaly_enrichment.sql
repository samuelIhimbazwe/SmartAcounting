CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tenant_embeddings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(120) NOT NULL,
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, entity_type, entity_id)
);

ALTER TABLE anomaly_cases
    ADD COLUMN IF NOT EXISTS kpi_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS current_value NUMERIC(20,4),
    ADD COLUMN IF NOT EXISTS expected_range VARCHAR(120),
    ADD COLUMN IF NOT EXISTS z_score NUMERIC(10,4),
    ADD COLUMN IF NOT EXISTS contributors_json JSONB;

ALTER TABLE tenant_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_embeddings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_embeddings_tenant_policy ON tenant_embeddings;
CREATE POLICY tenant_embeddings_tenant_policy ON tenant_embeddings
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
