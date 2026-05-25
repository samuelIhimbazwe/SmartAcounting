-- Idempotent guard for self-service signup (V39/V42) on databases that missed Flyway runs.
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS plan VARCHAR(80),
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS next_payment_due TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);

UPDATE tenants SET plan = COALESCE(plan, 'STANDARD') WHERE plan IS NULL;
UPDATE tenants SET billing_cycle = 'MONTHLY' WHERE billing_cycle IS NULL;
