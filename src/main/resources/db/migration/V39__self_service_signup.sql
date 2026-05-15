-- Self-service signup: tenant trial metadata, password-backed users, unique signup email/phone

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS plan VARCHAR(80),
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS next_payment_due TIMESTAMPTZ;

UPDATE tenants SET plan = 'STANDARD' WHERE plan IS NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS self_service_owner BOOLEAN NOT NULL DEFAULT FALSE;

-- One signup account per email (password-backed rows only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_signup_email_unique ON users (lower(username))
    WHERE password_hash IS NOT NULL;

-- One phone per user account (nullable allowed multiple times)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users (phone)
    WHERE phone IS NOT NULL;
