-- Demo tenant RBAC: RETAIL + MEDIUM onboarding profile for Inyange Supermarket.
-- (Requested as V81; V81__seed_permissions.sql already exists — applied as V84.)
-- Idempotent: clears prior demo-tenant roles from V82 legacy migration, then re-seeds.

-- ---------------------------------------------------------------------------
-- Reset demo-tenant RBAC (V82 may have created Business Owner / CFO / etc.)
-- ---------------------------------------------------------------------------
DELETE FROM user_roles
WHERE user_id IN (
    SELECT id FROM users WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
);

DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM roles WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
);

DELETE FROM roles
WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid;

-- ---------------------------------------------------------------------------
-- Step 1: tenant_setup — Amina completed onboarding Q&A
-- ---------------------------------------------------------------------------
INSERT INTO tenant_setup (
    id, tenant_id, business_size, business_type,
    selected_roles, completed_at, created_at
) VALUES (
    gen_random_uuid(),
    '11111111-1111-4111-8111-111111111111'::uuid,
    'MEDIUM',
    'RETAIL',
    '["Owner","Store Manager","Cashier","Stock Manager","Accountant","HR Manager","Marketing Lead"]'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (tenant_id) DO UPDATE SET
    business_size   = EXCLUDED.business_size,
    business_type   = EXCLUDED.business_type,
    selected_roles  = EXCLUDED.selected_roles,
    completed_at    = EXCLUDED.completed_at;

-- ---------------------------------------------------------------------------
-- Step 2: roles
-- ---------------------------------------------------------------------------
INSERT INTO roles (id, tenant_id, name, description, colour, emoji, is_system, is_owner, created_by, created_at, updated_at)
VALUES
    ('aaaaaaaa-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Owner',           'Full access to everything',                     '#1D9E75', '👑', true, true,  '33333333-3333-4333-8333-333333333301'::uuid, NOW(), NOW()),
    ('aaaaaaaa-0000-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Finance Manager', 'Manages finances, payroll and fiscal reporting', '#0C447C', '💰', true, false, '33333333-3333-4333-8333-333333333301'::uuid, NOW(), NOW()),
    ('aaaaaaaa-0000-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Store Manager',   'Runs day-to-day shop operations',                '#633806', '🏪', true, false, '33333333-3333-4333-8333-333333333301'::uuid, NOW(), NOW()),
    ('aaaaaaaa-0000-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Stock Manager',   'Manages inventory and purchase orders',           '#3C3489', '📦', true, false, '33333333-3333-4333-8333-333333333301'::uuid, NOW(), NOW()),
    ('aaaaaaaa-0000-4000-8000-000000000005'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'HR Manager',      'Manages staff, shifts and payroll',               '#712B13', '👥', true, false, '33333333-3333-4333-8333-333333333301'::uuid, NOW(), NOW()),
    ('aaaaaaaa-0000-4000-8000-000000000006'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Marketing Lead',  'Manages campaigns and promotions',                '#085041', '📢', true, false, '33333333-3333-4333-8333-333333333301'::uuid, NOW(), NOW()),
    ('aaaaaaaa-0000-4000-8000-000000000007'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Accountant',      'Finance reports, reconciliation and fiscal audit', '#501313', '📊', true, false, '33333333-3333-4333-8333-333333333301'::uuid, NOW(), NOW());

-- ---------------------------------------------------------------------------
-- Step 3: role_permissions
-- ---------------------------------------------------------------------------
-- Owner gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, id FROM permissions
ON CONFLICT DO NOTHING;

-- Finance Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'aaaaaaaa-0000-4000-8000-000000000002'::uuid, id FROM permissions
WHERE code IN ('FINANCE_READ','FINANCE_WRITE','FINANCE_CLOSE','PAYROLL_READ','PAYROLL_WRITE','ASSETS_MANAGE','EBM_AUDIT','REPORTS_EXPORT','ANALYTICS_ALL','AI_COPILOT','TENANT_CONFIG')
ON CONFLICT DO NOTHING;

-- Store Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'aaaaaaaa-0000-4000-8000-000000000003'::uuid, id FROM permissions
WHERE code IN ('POS_ACCESS','POS_TILL_MANAGE','POS_RETURNS','POS_DISCOUNT','EBM_SUBMIT','INVENTORY_READ','INVENTORY_WRITE','PROCUREMENT_READ','HR_READ','STAFF_INVITE','ANALYTICS_OWN','REPORTS_EXPORT','AI_COPILOT','USER_MANAGE')
ON CONFLICT DO NOTHING;

-- Stock Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'aaaaaaaa-0000-4000-8000-000000000004'::uuid, id FROM permissions
WHERE code IN ('INVENTORY_READ','INVENTORY_WRITE','INVENTORY_SHRINKAGE','PROCUREMENT_READ','PROCUREMENT_WRITE','ANALYTICS_OWN','REPORTS_EXPORT')
ON CONFLICT DO NOTHING;

-- HR Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'aaaaaaaa-0000-4000-8000-000000000005'::uuid, id FROM permissions
WHERE code IN ('HR_READ','HR_WRITE','PAYROLL_READ','STAFF_INVITE','ANALYTICS_OWN')
ON CONFLICT DO NOTHING;

-- Marketing Lead
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'aaaaaaaa-0000-4000-8000-000000000006'::uuid, id FROM permissions
WHERE code IN ('ANALYTICS_ALL','AI_COPILOT','REPORTS_EXPORT')
ON CONFLICT DO NOTHING;

-- Accountant
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'aaaaaaaa-0000-4000-8000-000000000007'::uuid, id FROM permissions
WHERE code IN ('FINANCE_READ','FINANCE_WRITE','EBM_AUDIT','EBM_CONFIG','PAYROLL_READ','REPORTS_EXPORT','ANALYTICS_OWN')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 4: user_roles
-- ---------------------------------------------------------------------------
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at) VALUES
    ('33333333-3333-4333-8333-333333333301'::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, NOW()),
    ('33333333-3333-4333-8333-333333333302'::uuid, 'aaaaaaaa-0000-4000-8000-000000000002'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, NOW()),
    ('33333333-3333-4333-8333-333333333303'::uuid, 'aaaaaaaa-0000-4000-8000-000000000003'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, NOW()),
    ('33333333-3333-4333-8333-333333333304'::uuid, 'aaaaaaaa-0000-4000-8000-000000000004'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, NOW()),
    ('33333333-3333-4333-8333-333333333305'::uuid, 'aaaaaaaa-0000-4000-8000-000000000005'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, NOW()),
    ('33333333-3333-4333-8333-333333333306'::uuid, 'aaaaaaaa-0000-4000-8000-000000000006'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, NOW()),
    ('33333333-3333-4333-8333-333333333307'::uuid, 'aaaaaaaa-0000-4000-8000-000000000007'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, NOW())
ON CONFLICT DO NOTHING;
