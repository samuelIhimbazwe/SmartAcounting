-- Public signup and login run before app.tenant_id is set on the JDBC connection.
-- SECURITY DEFINER helpers mirror V43 lookup_refresh_token_subject.

CREATE OR REPLACE FUNCTION public_signup_email_taken(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE lower(u.username) = lower(trim(p_email))
      AND (u.password_hash IS NOT NULL OR u.oauth_provider IS NOT NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public_signup_phone_taken(p_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.phone = p_phone
  );
$$;

CREATE OR REPLACE FUNCTION public_signup_oauth_subject_taken(p_provider text, p_subject text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.oauth_provider = p_provider AND u.oauth_subject = p_subject
  );
$$;

CREATE OR REPLACE FUNCTION lookup_signup_pending_by_phone(p_phone text)
RETURNS TABLE(tenant_id uuid, user_id uuid, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.tenant_id, u.id, u.username
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  WHERE u.phone = p_phone AND t.phone_verified = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION lookup_user_for_authentication(p_username text)
RETURNS TABLE(username text, password_hash text, role text, self_service_owner boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.username, u.password_hash, u.role, u.self_service_owner
  FROM users u
  WHERE lower(u.username) = lower(trim(p_username))
    AND (u.password_hash IS NOT NULL OR u.oauth_provider IS NOT NULL)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION lookup_password_reset_user_by_phone(p_phone text)
RETURNS TABLE(user_id uuid, tenant_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.tenant_id
  FROM users u
  WHERE u.phone = p_phone AND u.password_hash IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION lookup_password_reset_phone_by_email(p_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.phone
  FROM users u
  WHERE lower(u.username) = lower(trim(p_email)) AND u.password_hash IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public_signup_email_taken(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public_signup_phone_taken(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public_signup_oauth_subject_taken(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION lookup_signup_pending_by_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION lookup_user_for_authentication(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION lookup_password_reset_user_by_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION lookup_password_reset_phone_by_email(text) FROM PUBLIC;

DO $body$
DECLARE
  grantee text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smartchain') THEN
    grantee := 'smartchain';
  ELSE
    grantee := current_user;
  END IF;
  EXECUTE format('GRANT EXECUTE ON FUNCTION public_signup_email_taken(text) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public_signup_phone_taken(text) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public_signup_oauth_subject_taken(text, text) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION lookup_signup_pending_by_phone(text) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION lookup_user_for_authentication(text) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION lookup_password_reset_user_by_phone(text) TO %I', grantee);
  EXECUTE format('GRANT EXECUTE ON FUNCTION lookup_password_reset_phone_by_email(text) TO %I', grantee);
END
$body$;
