-- OAuth (Google / Microsoft) self-service signup: link IdP subject to users row

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(32),
    ADD COLUMN IF NOT EXISTS oauth_subject VARCHAR(255);

-- Replace partial unique on email: one identity per email for password OR OAuth-backed signups
DROP INDEX IF EXISTS idx_users_signup_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_signup_identity_unique
    ON users (lower(username))
    WHERE password_hash IS NOT NULL OR oauth_provider IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_provider_subject
    ON users (oauth_provider, oauth_subject)
    WHERE oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL;
