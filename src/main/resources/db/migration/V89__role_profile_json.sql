ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS role_profile_json TEXT;

UPDATE roles
SET role_profile_json = '{}'::text
WHERE role_profile_json IS NULL;
