-- Refresh tokens already exist (V4/V15). This migration documents prod JWT revocation via Redis (no DDL).
COMMENT ON TABLE refresh_tokens IS 'Hashed refresh tokens; rotation on consume. Access-token jti revocation uses Redis in prod.';
