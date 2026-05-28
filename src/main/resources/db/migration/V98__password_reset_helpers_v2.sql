-- Use new helper names to bypass stale function-signature resolution on managed Postgres.

DROP FUNCTION IF EXISTS lookup_password_reset_phone_by_email_v2(varchar);
DROP FUNCTION IF EXISTS lookup_password_reset_tenant_by_phone_v2(varchar);
DROP FUNCTION IF EXISTS lookup_password_reset_user_id_by_phone_v2(varchar);

CREATE OR REPLACE FUNCTION lookup_password_reset_phone_by_email_v2(p_email varchar)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result text;
BEGIN
  SET LOCAL row_security = off;
  SELECT u.phone INTO result
  FROM users u
  WHERE lower(u.username) = lower(trim(p_email))
    AND u.password_hash IS NOT NULL
  LIMIT 1;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION lookup_password_reset_tenant_by_phone_v2(p_phone varchar)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result uuid;
BEGIN
  SET LOCAL row_security = off;
  SELECT u.tenant_id INTO result
  FROM users u
  WHERE u.phone = p_phone
    AND u.password_hash IS NOT NULL
  LIMIT 1;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION lookup_password_reset_user_id_by_phone_v2(p_phone varchar)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result uuid;
BEGIN
  SET LOCAL row_security = off;
  SELECT u.id INTO result
  FROM users u
  WHERE u.phone = p_phone
    AND u.password_hash IS NOT NULL
  LIMIT 1;
  RETURN result;
END;
$$;

DO $body$
DECLARE
  grantee text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smartchain') THEN
    grantee := 'smartchain';
  ELSE
    grantee := current_user;
  END IF;
  EXECUTE format('GRANT EXECUTE ON FUNCTION lookup_password_reset_phone_by_email_v2(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION lookup_password_reset_tenant_by_phone_v2(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION lookup_password_reset_user_id_by_phone_v2(varchar) TO %I', grantee);
END
$body$;
