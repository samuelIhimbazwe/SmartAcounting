-- V82__migrate_existing_user_roles.sql
-- Migrates users from users.role (legacy string) → user_roles table.
-- SAFE: uses ON CONFLICT DO NOTHING throughout; never drops users.role column.
-- Idempotent: can be re-run without side-effects.
--
-- Run order: after V81__seed_permissions.sql

-- ============================================================
-- HELPER: find or create a named system role for a tenant
-- Returns the role UUID either way.
-- ============================================================
CREATE OR REPLACE FUNCTION v82_find_or_create_role(
    p_tenant_id  UUID,
    p_name       TEXT,
    p_emoji      TEXT,
    p_colour     TEXT,
    p_perm_codes TEXT[]
) RETURNS UUID AS $$
DECLARE
    v_role_id UUID;
BEGIN
    SELECT id INTO v_role_id
    FROM roles
    WHERE tenant_id = p_tenant_id
      AND name      = p_name
    LIMIT 1;

    IF v_role_id IS NULL THEN
        INSERT INTO roles (
            id, tenant_id, name, emoji, colour,
            is_system, is_owner, created_at
        )
        VALUES (
            gen_random_uuid(), p_tenant_id, p_name, p_emoji, p_colour,
            TRUE, FALSE, now()
        )
        RETURNING id INTO v_role_id;

        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_role_id, p.id
        FROM   permissions p
        WHERE  p.code = ANY(p_perm_codes)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_role_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- STEP 1
-- For every tenant that has NO completed tenant_setup,
-- ensure an Owner role exists and is assigned to the
-- self_service_owner user.
-- (Covers tenants created before the onboarding flow launched.)
-- ============================================================
DO $$
DECLARE
    v_tenant_id  UUID;
    v_owner_role UUID;
    v_ceo_id     UUID;
BEGIN
    FOR v_tenant_id IN
        SELECT DISTINCT u.tenant_id
        FROM   users u
        WHERE  NOT EXISTS (
                   SELECT 1
                   FROM   tenant_setup ts
                   WHERE  ts.tenant_id   = u.tenant_id
                     AND  ts.completed_at IS NOT NULL
               )
    LOOP
        -- Ensure owner role exists
        IF NOT EXISTS (
            SELECT 1 FROM roles
            WHERE  tenant_id = v_tenant_id AND is_owner = TRUE
        ) THEN
            INSERT INTO roles (
                id, tenant_id, name, description, emoji, colour,
                is_system, is_owner, created_at
            )
            VALUES (
                gen_random_uuid(), v_tenant_id,
                'Business Owner', 'Full access — all permissions granted',
                '👑', '#1A1A2E',
                TRUE, TRUE, now()
            )
            RETURNING id INTO v_owner_role;

            -- Attach every permission
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT v_owner_role, p.id FROM permissions p
            ON CONFLICT DO NOTHING;
        ELSE
            SELECT id INTO v_owner_role
            FROM   roles
            WHERE  tenant_id = v_tenant_id AND is_owner = TRUE
            LIMIT  1;
        END IF;

        -- Assign to self_service_owner user if not already assigned
        SELECT id INTO v_ceo_id
        FROM   users
        WHERE  tenant_id          = v_tenant_id
          AND  self_service_owner = TRUE
        LIMIT  1;

        IF v_ceo_id IS NOT NULL THEN
            INSERT INTO user_roles (user_id, role_id, assigned_at)
            VALUES (v_ceo_id, v_owner_role, now())
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;


-- ============================================================
-- STEP 2
-- For every user with a legacy users.role value that has NOT
-- yet been migrated (no rows in user_roles), map to the
-- closest new permission set and insert into user_roles.
-- ============================================================
DO $$
DECLARE
    v_user    RECORD;
    v_role_id UUID;
BEGIN
    FOR v_user IN
        SELECT u.id, u.tenant_id, u.role
        FROM   users u
        WHERE  u.role IS NOT NULL
          AND  NOT EXISTS (
                   SELECT 1
                   FROM   user_roles ur
                   WHERE  ur.user_id = u.id
               )
    LOOP
        v_role_id := NULL;

        CASE upper(trim(v_user.role))

            -- ---- CEO / Owner ----------------------------------------
            WHEN 'CEO', 'OWNER', 'BUSINESS_OWNER' THEN
                SELECT id INTO v_role_id
                FROM   roles
                WHERE  tenant_id = v_user.tenant_id
                  AND  is_owner  = TRUE
                LIMIT  1;

            -- ---- CFO ------------------------------------------------
            WHEN 'CFO' THEN
                v_role_id := v82_find_or_create_role(
                    v_user.tenant_id, 'CFO', '💼', '#B71C1C',
                    ARRAY[
                        'FINANCE_READ','FINANCE_WRITE','FINANCE_CLOSE',
                        'PAYROLL_READ','PAYROLL_WRITE',
                        'EBM_AUDIT','REPORTS_EXPORT',
                        'ANALYTICS_ALL','TENANT_CONFIG'
                    ]
                );

            -- ---- Sales ----------------------------------------------
            WHEN 'SALES', 'SALES_MANAGER' THEN
                v_role_id := v82_find_or_create_role(
                    v_user.tenant_id, 'Sales Manager', '📈', '#1B5E20',
                    ARRAY[
                        'POS_ACCESS','EBM_SUBMIT',
                        'INVENTORY_READ',
                        'ANALYTICS_OWN','REPORTS_EXPORT'
                    ]
                );

            -- ---- Operations -----------------------------------------
            WHEN 'OPERATIONS', 'OPS_MANAGER' THEN
                v_role_id := v82_find_or_create_role(
                    v_user.tenant_id, 'Operations Manager', '⚙️', '#E65100',
                    ARRAY[
                        'INVENTORY_READ','INVENTORY_WRITE','INVENTORY_SHRINKAGE',
                        'PROCUREMENT_READ','PROCUREMENT_WRITE',
                        'POS_ACCESS','ANALYTICS_OWN'
                    ]
                );

            -- ---- HR -------------------------------------------------
            WHEN 'HR', 'HR_MANAGER' THEN
                v_role_id := v82_find_or_create_role(
                    v_user.tenant_id, 'HR Manager', '👥', '#006064',
                    ARRAY[
                        'HR_READ','HR_WRITE',
                        'PAYROLL_READ','ANALYTICS_OWN'
                    ]
                );

            -- ---- Marketing ------------------------------------------
            WHEN 'MARKETING', 'MARKETING_MANAGER' THEN
                v_role_id := v82_find_or_create_role(
                    v_user.tenant_id, 'Marketing Manager', '📣', '#880E4F',
                    ARRAY[
                        'ANALYTICS_ALL','AI_COPILOT','REPORTS_EXPORT'
                    ]
                );

            -- ---- Accounting -----------------------------------------
            WHEN 'ACCOUNTING', 'ACCOUNTING_CONTROLLER' THEN
                v_role_id := v82_find_or_create_role(
                    v_user.tenant_id, 'Accountant', '📊', '#4A148C',
                    ARRAY[
                        'FINANCE_READ','FINANCE_WRITE',
                        'EBM_AUDIT','PAYROLL_READ','REPORTS_EXPORT'
                    ]
                );

            -- ---- Unknown: fall back to owner role -------------------
            ELSE
                SELECT id INTO v_role_id
                FROM   roles
                WHERE  tenant_id = v_user.tenant_id
                  AND  is_owner  = TRUE
                LIMIT  1;
        END CASE;

        IF v_role_id IS NOT NULL THEN
            INSERT INTO user_roles (user_id, role_id, assigned_at)
            VALUES (v_user.id, v_role_id, now())
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;


-- ============================================================
-- STEP 3
-- Verify: every user now has at least one user_roles entry.
-- Raises an exception (rolls back) if any user was left behind.
-- Comment this block out if you need the migration to be
-- non-blocking on partial data.
-- ============================================================
DO $$
DECLARE
    v_orphan_count INT;
BEGIN
    SELECT COUNT(*) INTO v_orphan_count
    FROM   users u
    WHERE  NOT EXISTS (
               SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
           );

    IF v_orphan_count > 0 THEN
        RAISE EXCEPTION
            'V82 migration incomplete: % user(s) have no user_roles entry. '
            'Check users.role values for unmapped strings.',
            v_orphan_count;
    END IF;
END $$;


-- ============================================================
-- Clean up helper function
-- ============================================================
DROP FUNCTION IF EXISTS v82_find_or_create_role(UUID, TEXT, TEXT, TEXT, TEXT[]);
