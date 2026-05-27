-- Login identity resolution must work before app.tenant_id is set (same as V90 helpers).

CREATE OR REPLACE FUNCTION lookup_login_identity(p_username text)
RETURNS TABLE(tenant_id uuid, user_id uuid, role text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN QUERY
  SELECT u.tenant_id, u.id, u.role
  FROM users u
  WHERE lower(u.username) = lower(trim(p_username))
    AND (u.password_hash IS NOT NULL OR u.oauth_provider IS NOT NULL)
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION lookup_login_identity(text) FROM PUBLIC;

DO $body$
DECLARE
  grantee text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smartchain') THEN
    grantee := 'smartchain';
  ELSE
    grantee := current_user;
  END IF;
  EXECUTE format('GRANT EXECUTE ON FUNCTION lookup_login_identity(text) TO %I', grantee);
END
$body$;
