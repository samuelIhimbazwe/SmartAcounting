-- Persist self-service billing cycle alongside the chosen plan tier.
-- Public signup now accepts plan = TRIAL | STARTER | PROFESSIONAL | ENTERPRISE,
-- with a billing cycle that determines monthly vs annual renewal pricing.

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);

UPDATE tenants SET billing_cycle = 'MONTHLY' WHERE billing_cycle IS NULL;
