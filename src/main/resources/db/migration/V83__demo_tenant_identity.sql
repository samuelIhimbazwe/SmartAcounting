-- Demo tenant identity: rebrand seed data as a realistic Rwanda retail business.
-- (Requested as V80; V80__roles_add_emoji.sql already exists — applied as V83.)

SELECT set_config('app.tenant_id', '11111111-1111-4111-8111-111111111111', true);

-- ---------------------------------------------------------------------------
-- Schema: add profile columns if Hibernate / prior envs have not created them
-- ---------------------------------------------------------------------------
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS country VARCHAR(3),
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS tin VARCHAR(32);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS job_title VARCHAR(120);

-- ---------------------------------------------------------------------------
-- Demo tenant: Inyange Supermarket — Kimironko, Kigali
-- ---------------------------------------------------------------------------
UPDATE tenants SET
    name = 'Inyange Supermarket',
    display_name = 'Inyange Supermarket — Kimironko',
    country = 'RW',
    currency = 'RWF',
    timezone = 'Africa/Kigali',
    phone = '+250788000000',
    address = 'KG 11 Ave, Kimironko, Kigali, Rwanda',
    tin = '102345678'
WHERE id = '11111111-1111-4111-8111-111111111111'::uuid;

-- ---------------------------------------------------------------------------
-- Demo users: Rwandan names and job titles (V41 seed user UUIDs)
-- ---------------------------------------------------------------------------
UPDATE users SET display_name = 'Amina Uwase',         email = 'amina@inyange.rw',   job_title = 'Owner & Director'             WHERE id = '33333333-3333-4333-8333-333333333301'::uuid;
UPDATE users SET display_name = 'Jean-Pierre Habimana', email = 'jp@inyange.rw',        job_title = 'Finance Manager'              WHERE id = '33333333-3333-4333-8333-333333333302'::uuid;
UPDATE users SET display_name = 'Grace Mukamana',      email = 'grace@inyange.rw',     job_title = 'Store Manager'                WHERE id = '33333333-3333-4333-8333-333333333303'::uuid;
UPDATE users SET display_name = 'Patrick Nzabonimpa',  email = 'patrick@inyange.rw',   job_title = 'Stock & Operations Manager'   WHERE id = '33333333-3333-4333-8333-333333333304'::uuid;
UPDATE users SET display_name = 'Diane Uwineza',       email = 'diane@inyange.rw',     job_title = 'HR & Administration'          WHERE id = '33333333-3333-4333-8333-333333333305'::uuid;
UPDATE users SET display_name = 'Eric Ndayambaje',     email = 'eric@inyange.rw',      job_title = 'Marketing Lead'               WHERE id = '33333333-3333-4333-8333-333333333306'::uuid;
UPDATE users SET display_name = 'Solange Iradukunda',   email = 'solange@inyange.rw',   job_title = 'Accountant'                   WHERE id = '33333333-3333-4333-8333-333333333307'::uuid;

-- Align RRA settings TIN with tenant profile when present
UPDATE rra_rwanda_settings SET
    tin = '102345678',
    company_trade_name = 'Inyange Supermarket'
WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid;
