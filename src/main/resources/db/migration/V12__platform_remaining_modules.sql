CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    field_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    event_type VARCHAR(120) NOT NULL,
    channels_json JSONB NOT NULL,
    target_role VARCHAR(80),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    event_type VARCHAR(120) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_queue (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    action_type VARCHAR(80) NOT NULL,
    action_ref VARCHAR(120),
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tax_profiles (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    tax_code VARCHAR(40) NOT NULL,
    rate NUMERIC(10,4) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_templates (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    role VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    assumptions_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custom_field_values_tenant_policy ON custom_field_values;
CREATE POLICY custom_field_values_tenant_policy ON custom_field_values
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_rules_tenant_policy ON notification_rules;
CREATE POLICY notification_rules_tenant_policy ON notification_rules
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_events_tenant_policy ON notification_events;
CREATE POLICY notification_events_tenant_policy ON notification_events
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_queue FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS action_queue_tenant_policy ON action_queue;
CREATE POLICY action_queue_tenant_policy ON action_queue
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tax_profiles_tenant_policy ON tax_profiles;
CREATE POLICY tax_profiles_tenant_policy ON tax_profiles
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE scenario_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scenario_templates_tenant_policy ON scenario_templates;
CREATE POLICY scenario_templates_tenant_policy ON scenario_templates
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
