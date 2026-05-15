-- RLS must re-read app.tenant_id for every row; a bare STABLE expression (or STABLE function) can be
-- evaluated once per statement. A correlated scalar subquery forces per-row evaluation.
DROP POLICY IF EXISTS event_log_tenant_policy ON event_log;
CREATE POLICY event_log_tenant_policy ON event_log
    USING (tenant_id = (SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid))
    WITH CHECK (tenant_id = (SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid));
