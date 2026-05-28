-- Clean auth helper layer: scalar-only functions (no SRF-in-FROM), varchar params for JDBC.
-- Supersedes lookup_* / public_signup_* churn from V90-V98.

CREATE OR REPLACE FUNCTION auth_email_taken(p_email varchar)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1 FROM users u
    WHERE lower(u.username) = lower(trim(p_email))
      AND (u.password_hash IS NOT NULL OR u.oauth_provider IS NOT NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION auth_phone_taken(p_phone varchar)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (SELECT 1 FROM users u WHERE u.phone = p_phone);
END;
$$;

CREATE OR REPLACE FUNCTION auth_oauth_subject_taken(p_provider varchar, p_subject varchar)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1 FROM users u
    WHERE u.oauth_provider = p_provider AND u.oauth_subject = p_subject
  );
END;
$$;

CREATE OR REPLACE FUNCTION auth_user_row_json(p_username varchar)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  SET LOCAL row_security = off;
  SELECT to_json(sub) INTO result
  FROM (
    SELECT u.username, u.password_hash, u.role, u.self_service_owner
    FROM users u
    WHERE lower(u.username) = lower(trim(p_username))
      AND (u.password_hash IS NOT NULL OR u.oauth_provider IS NOT NULL)
    LIMIT 1
  ) sub;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_login_identity_json(p_username varchar)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  SET LOCAL row_security = off;
  SELECT to_json(sub) INTO result
  FROM (
    SELECT u.tenant_id, u.id AS user_id, u.role
    FROM users u
    WHERE lower(u.username) = lower(trim(p_username))
      AND (u.password_hash IS NOT NULL OR u.oauth_provider IS NOT NULL)
    LIMIT 1
  ) sub;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_signup_pending_json(p_phone varchar)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  SET LOCAL row_security = off;
  SELECT to_json(sub) INTO result
  FROM (
    SELECT u.tenant_id, u.id AS user_id, u.username
    FROM users u
    JOIN tenants t ON t.id = u.tenant_id
    WHERE u.phone = p_phone AND t.phone_verified = false
    LIMIT 1
  ) sub;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_reset_phone_by_email(p_email varchar)
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
  WHERE lower(u.username) = lower(trim(p_email)) AND u.password_hash IS NOT NULL
  LIMIT 1;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_reset_tenant_by_phone(p_phone varchar)
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
  WHERE u.phone = p_phone AND u.password_hash IS NOT NULL
  LIMIT 1;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_reset_user_by_phone(p_phone varchar)
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
  WHERE u.phone = p_phone AND u.password_hash IS NOT NULL
  LIMIT 1;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_refresh_subject_json(p_token_hash varchar)
RETURNS json
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  SET LOCAL row_security = off;
  SELECT to_json(sub) INTO result
  FROM (
    SELECT rt.tenant_id, rt.user_id
    FROM refresh_tokens rt
    WHERE rt.token_hash = p_token_hash
    LIMIT 1
  ) sub;
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
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_email_taken(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_phone_taken(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_oauth_subject_taken(varchar, varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_user_row_json(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_login_identity_json(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_signup_pending_json(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_reset_phone_by_email(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_reset_tenant_by_phone(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_reset_user_by_phone(varchar) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION auth_refresh_subject_json(varchar) TO %I', grantee);
END
$body$;
