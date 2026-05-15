-- Resolve tenant for a refresh token before app.tenant_id is set (login/refresh body flows).
-- SECURITY DEFINER bypasses RLS on refresh_tokens; only exposes tenant_id/user_id for an exact hash match.
CREATE OR REPLACE FUNCTION lookup_refresh_token_subject(p_token_hash text)
RETURNS TABLE(tenant_id uuid, user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rt.tenant_id, rt.user_id
  FROM refresh_tokens rt
  WHERE rt.token_hash = p_token_hash
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION lookup_refresh_token_subject(text) FROM PUBLIC;
-- Production uses role `smartchain`; embedded/minimal Postgres often has only the bootstrap user.
DO $body$
DECLARE
  grantee text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smartchain') THEN
    grantee := 'smartchain';
  ELSE
    grantee := current_user;
  END IF;
  EXECUTE format('GRANT EXECUTE ON FUNCTION lookup_refresh_token_subject(text) TO %I', grantee);
END
$body$;
