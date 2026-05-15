-- current_tenant_id() reads session GUC app.tenant_id. As STABLE with no arguments, PostgreSQL may
-- evaluate it once per statement and reuse the value for every RLS row check, breaking isolation.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql VOLATILE;
