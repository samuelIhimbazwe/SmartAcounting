CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_custom_fields FORCE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log FORCE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE ceo_kpi_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_kpi_snapshot FORCE ROW LEVEL SECURITY;
ALTER TABLE cfo_financial_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfo_financial_snapshot FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_pipeline_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_pipeline_snapshot FORCE ROW LEVEL SECURITY;
ALTER TABLE ops_efficiency_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_efficiency_snapshot FORCE ROW LEVEL SECURITY;
ALTER TABLE hr_workforce_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_workforce_snapshot FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_roi_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_roi_snapshot FORCE ROW LEVEL SECURITY;
ALTER TABLE accounting_close_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_close_snapshot FORCE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detection_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detection_feed FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_tenant_policy ON audit_log;
CREATE POLICY audit_log_tenant_policy ON audit_log
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS sync_queue_tenant_policy ON sync_queue;
CREATE POLICY sync_queue_tenant_policy ON sync_queue
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_custom_fields_tenant_policy ON tenant_custom_fields;
CREATE POLICY tenant_custom_fields_tenant_policy ON tenant_custom_fields
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS event_log_tenant_policy ON event_log;
CREATE POLICY event_log_tenant_policy ON event_log
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS users_tenant_policy ON users;
CREATE POLICY users_tenant_policy ON users
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS ceo_snapshot_tenant_policy ON ceo_kpi_snapshot;
CREATE POLICY ceo_snapshot_tenant_policy ON ceo_kpi_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS cfo_snapshot_tenant_policy ON cfo_financial_snapshot;
CREATE POLICY cfo_snapshot_tenant_policy ON cfo_financial_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS sales_snapshot_tenant_policy ON sales_pipeline_snapshot;
CREATE POLICY sales_snapshot_tenant_policy ON sales_pipeline_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS ops_snapshot_tenant_policy ON ops_efficiency_snapshot;
CREATE POLICY ops_snapshot_tenant_policy ON ops_efficiency_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS hr_snapshot_tenant_policy ON hr_workforce_snapshot;
CREATE POLICY hr_snapshot_tenant_policy ON hr_workforce_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS marketing_snapshot_tenant_policy ON marketing_roi_snapshot;
CREATE POLICY marketing_snapshot_tenant_policy ON marketing_roi_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS accounting_snapshot_tenant_policy ON accounting_close_snapshot;
CREATE POLICY accounting_snapshot_tenant_policy ON accounting_close_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS anomaly_feed_tenant_policy ON anomaly_detection_feed;
CREATE POLICY anomaly_feed_tenant_policy ON anomaly_detection_feed
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
