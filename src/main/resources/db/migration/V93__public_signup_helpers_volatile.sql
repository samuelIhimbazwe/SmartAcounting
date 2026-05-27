-- V92 used STABLE + SET LOCAL row_security, which Postgres rejects (0A000).
-- Recreate helpers as VOLATILE so SET LOCAL is allowed.

CREATE OR REPLACE FUNCTION public_signup_email_taken(p_email text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1
    FROM users u
    WHERE lower(u.username) = lower(trim(p_email))
      AND (u.password_hash IS NOT NULL OR u.oauth_provider IS NOT NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public_signup_phone_taken(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1
    FROM users u
    WHERE u.phone = p_phone
  );
END;
$$;

CREATE OR REPLACE FUNCTION public_signup_oauth_subject_taken(p_provider text, p_subject text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1
    FROM users u
    WHERE u.oauth_provider = p_provider AND u.oauth_subject = p_subject
  );
END;
$$;

CREATE OR REPLACE FUNCTION lookup_signup_pending_by_phone(p_phone text)
RETURNS TABLE(tenant_id uuid, user_id uuid, username text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN QUERY
  SELECT u.tenant_id, u.id, u.username
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  WHERE u.phone = p_phone AND t.phone_verified = false
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION lookup_user_for_authentication(p_username text)
RETURNS TABLE(username text, password_hash text, role text, self_service_owner boolean)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN QUERY
  SELECT u.username, u.password_hash, u.role, u.self_service_owner
  FROM users u
  WHERE lower(u.username) = lower(trim(p_username))
    AND (u.password_hash IS NOT NULL OR u.oauth_provider IS NOT NULL)
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION lookup_password_reset_user_by_phone(p_phone text)
RETURNS TABLE(user_id uuid, tenant_id uuid)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN QUERY
  SELECT u.id, u.tenant_id
  FROM users u
  WHERE u.phone = p_phone AND u.password_hash IS NOT NULL
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION lookup_password_reset_phone_by_email(p_email text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  SET LOCAL row_security = off;
  SELECT u.phone
  INTO result
  FROM users u
  WHERE lower(u.username) = lower(trim(p_email)) AND u.password_hash IS NOT NULL
  LIMIT 1;
  RETURN result;
END;
$$;
