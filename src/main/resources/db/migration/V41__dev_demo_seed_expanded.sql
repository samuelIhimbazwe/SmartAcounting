-- =====================================================================
-- V41: Expanded dev/demo seed for end-to-end feature testing.
--
-- Goal: every major feature (finance, inventory, POS, HR, assets, sales,
-- procurement, notifications, workflow, FX, anomaly, dashboards, RRA,
-- copilot, audit, marketplace, sharing) has realistic data so testers
-- (human + AI) can exercise the UI without manually creating records.
--
-- All inserts are idempotent (ON CONFLICT DO NOTHING / NOT EXISTS) and
-- target the demo tenant from V40 (11111111-1111-4111-8111-111111111111).
-- Dates use NOW() / CURRENT_DATE intervals so "overdue" / "near-expiry"
-- stay realistic over time.
--
-- Login (in-memory users): ceo / cfo / sales / ops / hr / marketing /
-- accounting -- all with password "password". Tenant UUID above.
-- =====================================================================

SELECT set_config('app.tenant_id', '11111111-1111-4111-8111-111111111111', true);

-- ---------------------------------------------------------------------
-- 0. Secondary tenant for cross-tenant / data-sharing scenarios
-- ---------------------------------------------------------------------
INSERT INTO tenants (id, name, status, created_at, plan, phone_verified)
VALUES
    ('11111111-1111-4111-8111-111111111112'::uuid, 'Demo Supply Partner Co', 'ACTIVE', NOW(), 'STANDARD', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 1. DB-side user rows (auth still uses in-memory users; these enable
--    joins for HR/audit/copilot ownership and signup-style queries).
-- ---------------------------------------------------------------------
INSERT INTO users (id, tenant_id, username, role, created_at, self_service_owner)
VALUES
    ('33333333-3333-4333-8333-333333333301'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'ceo',        'CEO',                   NOW(), TRUE),
    ('33333333-3333-4333-8333-333333333302'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'cfo',        'CFO',                   NOW(), FALSE),
    ('33333333-3333-4333-8333-333333333303'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'sales',      'SALES_MANAGER',         NOW(), FALSE),
    ('33333333-3333-4333-8333-333333333304'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'ops',        'OPS_MANAGER',           NOW(), FALSE),
    ('33333333-3333-4333-8333-333333333305'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'hr',         'HR_MANAGER',            NOW(), FALSE),
    ('33333333-3333-4333-8333-333333333306'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'marketing',  'MARKETING_MANAGER',     NOW(), FALSE),
    ('33333333-3333-4333-8333-333333333307'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'accounting', 'ACCOUNTING_CONTROLLER', NOW(), FALSE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Products (expanded retail catalog)
-- ---------------------------------------------------------------------
INSERT INTO products (id, tenant_id, name, sku, unit, created_at, barcode)
VALUES
    ('22222222-2222-4222-8222-222222222204'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Cooking Oil 1L',     'DEMO-OIL',     'EA', NOW(), '5901234123460'),
    ('22222222-2222-4222-8222-222222222205'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Rice 5kg',           'DEMO-RICE',    'EA', NOW(), '5901234123461'),
    ('22222222-2222-4222-8222-222222222206'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Sugar 1kg',          'DEMO-SUGAR',   'EA', NOW(), '5901234123462'),
    ('22222222-2222-4222-8222-222222222207'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Soap Bar',           'DEMO-SOAP',    'EA', NOW(), '5901234123463'),
    ('22222222-2222-4222-8222-222222222208'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Tea Leaves 250g',    'DEMO-TEA',     'EA', NOW(), '5901234123464'),
    ('22222222-2222-4222-8222-222222222209'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Bread Loaf',         'DEMO-BREAD',   'EA', NOW(), '5901234123465'),
    ('22222222-2222-4222-8222-222222222210'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Milk 1L',            'DEMO-MILK',    'EA', NOW(), '5901234123466'),
    ('22222222-2222-4222-8222-222222222211'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Eggs Tray (30)',     'DEMO-EGGS',    'EA', NOW(), '5901234123467'),
    ('22222222-2222-4222-8222-222222222212'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Soft Drink 500ml',   'DEMO-DRINK',   'EA', NOW(), '5901234123468'),
    ('22222222-2222-4222-8222-222222222213'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Notebook A5',        'DEMO-NOTE',    'EA', NOW(), '5901234123469'),
    ('22222222-2222-4222-8222-222222222214'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Pen Pack (10)',      'DEMO-PEN',     'EA', NOW(), '5901234123470'),
    ('22222222-2222-4222-8222-222222222215'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Demo Charcoal 3kg',       'DEMO-COAL',    'EA', NOW(), '5901234123471')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Inventory balances at SHOP (varied levels: some plentiful, some
--    low-stock, some zero/negative-risk for alert testing)
-- ---------------------------------------------------------------------
INSERT INTO inventory_balances (id, tenant_id, product_id, location_code, quantity, version, created_at, updated_at)
VALUES
    ('33333333-3333-4333-8333-333333333304'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222204'::uuid, 'SHOP',  45.0000, 0, NOW(), NOW()),
    ('33333333-3333-4333-8333-333333333305'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222205'::uuid, 'SHOP',  22.0000, 0, NOW(), NOW()),
    ('33333333-3333-4333-8333-333333333306'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222206'::uuid, 'SHOP',   3.0000, 0, NOW(), NOW()),  -- low
    ('33333333-3333-4333-8333-333333333307'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222207'::uuid, 'SHOP', 200.0000, 0, NOW(), NOW()),
    ('33333333-3333-4333-8333-333333333308'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222208'::uuid, 'SHOP',  14.0000, 0, NOW(), NOW()),
    ('33333333-3333-4333-8333-333333333309'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222209'::uuid, 'SHOP',   6.0000, 0, NOW(), NOW()),  -- low (perishable)
    ('33333333-3333-4333-8333-333333333310'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222210'::uuid, 'SHOP',  18.0000, 0, NOW(), NOW()),
    ('33333333-3333-4333-8333-333333333311'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222211'::uuid, 'SHOP',   4.0000, 0, NOW(), NOW()),  -- low
    ('33333333-3333-4333-8333-333333333312'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222212'::uuid, 'SHOP',  90.0000, 0, NOW(), NOW()),
    ('33333333-3333-4333-8333-333333333313'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222213'::uuid, 'SHOP',  60.0000, 0, NOW(), NOW()),
    ('33333333-3333-4333-8333-333333333314'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222214'::uuid, 'SHOP',  30.0000, 0, NOW(), NOW()),
    ('33333333-3333-4333-8333-333333333315'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222215'::uuid, 'SHOP',  25.0000, 0, NOW(), NOW())
ON CONFLICT (tenant_id, product_id, location_code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Inventory batches with various expiry dates (FEFO + expiry risk)
-- ---------------------------------------------------------------------
INSERT INTO inventory_batches (id, tenant_id, product_id, location_code, lot_code, expiry_date, quantity_on_hand, cost_price, created_at, updated_at)
VALUES
    -- Milk: two lots, near-expiry first (FEFO test)
    ('ba111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222210'::uuid, 'SHOP', 'MILK-A', (CURRENT_DATE + INTERVAL '5 days')::date,  8.0000,  600.00, NOW(), NOW()),
    ('ba111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222210'::uuid, 'SHOP', 'MILK-B', (CURRENT_DATE + INTERVAL '20 days')::date, 10.0000, 600.00, NOW(), NOW()),
    -- Bread: extremely near-expiry
    ('ba111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222209'::uuid, 'SHOP', 'BREAD-T', (CURRENT_DATE + INTERVAL '2 days')::date,  6.0000,  400.00, NOW(), NOW()),
    -- Eggs: expiring this week
    ('ba111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222211'::uuid, 'SHOP', 'EGG-1', (CURRENT_DATE + INTERVAL '7 days')::date,  4.0000, 3500.00, NOW(), NOW()),
    -- Sugar: long shelf life
    ('ba111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222206'::uuid, 'SHOP', 'SUG-1', (CURRENT_DATE + INTERVAL '180 days')::date, 3.0000, 1100.00, NOW(), NOW()),
    -- Rice: 1 year shelf
    ('ba111111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222205'::uuid, 'SHOP', 'RICE-Q3', (CURRENT_DATE + INTERVAL '365 days')::date, 22.0000, 6000.00, NOW(), NOW()),
    -- Cooking oil: medium shelf
    ('ba111111-1111-4111-8111-111111111107'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222204'::uuid, 'SHOP', 'OIL-1', (CURRENT_DATE + INTERVAL '120 days')::date, 45.0000, 2400.00, NOW(), NOW()),
    -- Tea: long shelf life
    ('ba111111-1111-4111-8111-111111111108'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222208'::uuid, 'SHOP', 'TEA-1', (CURRENT_DATE + INTERVAL '300 days')::date, 14.0000, 800.00, NOW(), NOW()),
    -- Soft drink: near expiry too (for variety)
    ('ba111111-1111-4111-8111-111111111109'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222212'::uuid, 'SHOP', 'DRK-1', (CURRENT_DATE + INTERVAL '10 days')::date, 30.0000, 400.00, NOW(), NOW()),
    ('ba111111-1111-4111-8111-111111111110'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222212'::uuid, 'SHOP', 'DRK-2', (CURRENT_DATE + INTERVAL '60 days')::date, 60.0000, 400.00, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. POS catalog items (priced; link to products for stock deduction)
-- ---------------------------------------------------------------------
INSERT INTO pos_catalog_items (id, tenant_id, barcode, sku, display_name, unit_price, currency_code, active, created_at, product_id, reorder_point)
VALUES
    ('44444444-4444-4444-8444-444444444404'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123460', 'DEMO-OIL',   'Demo Cooking Oil 1L',   3000.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222204'::uuid, 10.0000),
    ('44444444-4444-4444-8444-444444444405'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123461', 'DEMO-RICE',  'Demo Rice 5kg',         8500.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222205'::uuid, 8.0000),
    ('44444444-4444-4444-8444-444444444406'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123462', 'DEMO-SUGAR', 'Demo Sugar 1kg',        1500.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222206'::uuid, 10.0000),
    ('44444444-4444-4444-8444-444444444407'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123463', 'DEMO-SOAP',  'Demo Soap Bar',          800.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222207'::uuid, 30.0000),
    ('44444444-4444-4444-8444-444444444408'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123464', 'DEMO-TEA',   'Demo Tea Leaves 250g',  1200.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222208'::uuid, 8.0000),
    ('44444444-4444-4444-8444-444444444409'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123465', 'DEMO-BREAD', 'Demo Bread Loaf',        700.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222209'::uuid, 8.0000),
    ('44444444-4444-4444-8444-444444444410'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123466', 'DEMO-MILK',  'Demo Milk 1L',           900.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222210'::uuid, 12.0000),
    ('44444444-4444-4444-8444-444444444411'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123467', 'DEMO-EGGS',  'Demo Eggs Tray (30)',   5500.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222211'::uuid, 6.0000),
    ('44444444-4444-4444-8444-444444444412'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123468', 'DEMO-DRINK', 'Demo Soft Drink 500ml',  600.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222212'::uuid, 20.0000),
    ('44444444-4444-4444-8444-444444444413'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123469', 'DEMO-NOTE',  'Demo Notebook A5',      1000.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222213'::uuid, 15.0000),
    ('44444444-4444-4444-8444-444444444414'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123470', 'DEMO-PEN',   'Demo Pen Pack (10)',    2200.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222214'::uuid, 10.0000),
    ('44444444-4444-4444-8444-444444444415'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '5901234123471', 'DEMO-COAL',  'Demo Charcoal 3kg',     2500.00, 'FRW', TRUE, NOW(), '22222222-2222-4222-8222-222222222215'::uuid, 8.0000)
ON CONFLICT (tenant_id, barcode) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. Finance customers (varied credit limits + bad-debt risk scores)
-- ---------------------------------------------------------------------
INSERT INTO finance_customers (id, tenant_id, customer_name, credit_limit, bad_debt_risk_score, created_at, updated_at)
VALUES
    ('c1111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Kigali Cafe Ltd',         500000.00,  0.05, NOW(), NOW()),
    ('c1111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Nyamirambo Grocers',      250000.00,  0.15, NOW(), NOW()),
    ('c1111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Remera School Canteen',   100000.00,  0.10, NOW(), NOW()),
    ('c1111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Gisenyi Hotel Group',     800000.00,  0.20, NOW(), NOW()),
    ('c1111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer',         50000.00,  0.02, NOW(), NOW()),
    ('c1111111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Musanze Bistro',          150000.00,  0.45, NOW(), NOW()),  -- high risk
    ('c1111111-1111-4111-8111-111111111107'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Huye Catering Co',        300000.00,  0.08, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. Finance suppliers (credit limit + payment terms)
-- ---------------------------------------------------------------------
INSERT INTO finance_suppliers (id, tenant_id, supplier_name, credit_limit, payment_terms_days, created_at, updated_at)
VALUES
    ('b1111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Kigali Wholesale Foods',  2000000.00, 30, NOW(), NOW()),
    ('b1111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Akagera Beverages',       1000000.00, 14, NOW(), NOW()),
    ('b1111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Rwanda Office Supplies',   500000.00, 45, NOW(), NOW()),
    ('b1111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'East-African Dairy Co',   1500000.00,  7, NOW(), NOW()),
    ('b1111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Local Charcoal Coop',      300000.00, 30, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 8. Invoices (AR) - varied statuses + overdue stages for aging report
-- ---------------------------------------------------------------------
INSERT INTO invoices (id, tenant_id, customer_id, customer_name, amount, currency_code, due_date, status, reminder_count, last_reminder_sent_date, created_at)
VALUES
    -- OPEN current
    ('e1111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111101'::uuid, 'Kigali Cafe Ltd',         125000.00, 'FRW', (CURRENT_DATE + INTERVAL '7 days')::date,   'OPEN',          0, NULL,                                   NOW() - INTERVAL '5 days'),
    ('e1111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111102'::uuid, 'Nyamirambo Grocers',       82500.00, 'FRW', (CURRENT_DATE + INTERVAL '14 days')::date,  'OPEN',          0, NULL,                                   NOW() - INTERVAL '3 days'),
    -- OPEN, slightly overdue (15-30 day bucket)
    ('e1111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111103'::uuid, 'Remera School Canteen',    65000.00, 'FRW', (CURRENT_DATE - INTERVAL '20 days')::date,  'OPEN',          1, (CURRENT_DATE - INTERVAL '5 days')::date, NOW() - INTERVAL '50 days'),
    -- OPEN, 60-day overdue bucket
    ('e1111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111104'::uuid, 'Gisenyi Hotel Group',     320000.00, 'FRW', (CURRENT_DATE - INTERVAL '45 days')::date,  'OPEN',          2, (CURRENT_DATE - INTERVAL '10 days')::date, NOW() - INTERVAL '75 days'),
    -- OPEN, 90+ overdue bucket (deep aging)
    ('e1111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111106'::uuid, 'Musanze Bistro',          145000.00, 'FRW', (CURRENT_DATE - INTERVAL '120 days')::date, 'OPEN',          3, (CURRENT_DATE - INTERVAL '30 days')::date, NOW() - INTERVAL '150 days'),
    -- PARTIALLY_PAID
    ('e1111111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111107'::uuid, 'Huye Catering Co',         95000.00, 'FRW', (CURRENT_DATE + INTERVAL '5 days')::date,   'PARTIALLY_PAID',0, NULL,                                   NOW() - INTERVAL '25 days'),
    -- PAID
    ('e1111111-1111-4111-8111-111111111107'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111101'::uuid, 'Kigali Cafe Ltd',         110000.00, 'FRW', (CURRENT_DATE - INTERVAL '30 days')::date,  'PAID',          0, NULL,                                   NOW() - INTERVAL '60 days'),
    ('e1111111-1111-4111-8111-111111111108'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111102'::uuid, 'Nyamirambo Grocers',       45000.00, 'FRW', (CURRENT_DATE - INTERVAL '15 days')::date,  'PAID',          0, NULL,                                   NOW() - INTERVAL '40 days'),
    -- POS on-account (typical 14-day terms)
    ('e1111111-1111-4111-8111-111111111109'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, NULL,                                            'POS Walk-In On-Account',   12500.00, 'FRW', (CURRENT_DATE + INTERVAL '11 days')::date,  'OPEN',          0, NULL,                                   NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 9. Supplier bills (AP) - varied statuses + aging
-- ---------------------------------------------------------------------
INSERT INTO supplier_bills (id, tenant_id, supplier_id, supplier_name, amount, currency_code, due_date, status, created_at)
VALUES
    ('f1111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'b1111111-1111-4111-8111-111111111101'::uuid, 'Kigali Wholesale Foods', 850000.00, 'FRW', (CURRENT_DATE + INTERVAL '14 days')::date,  'OPEN',          NOW() - INTERVAL '5 days'),
    ('f1111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'b1111111-1111-4111-8111-111111111102'::uuid, 'Akagera Beverages',      220000.00, 'FRW', (CURRENT_DATE - INTERVAL '5 days')::date,   'OPEN',          NOW() - INTERVAL '20 days'),
    ('f1111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'b1111111-1111-4111-8111-111111111103'::uuid, 'Rwanda Office Supplies',  78000.00, 'FRW', (CURRENT_DATE - INTERVAL '40 days')::date,  'OPEN',          NOW() - INTERVAL '90 days'),
    ('f1111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'b1111111-1111-4111-8111-111111111104'::uuid, 'East-African Dairy Co',  165000.00, 'FRW', (CURRENT_DATE + INTERVAL '3 days')::date,   'OPEN',          NOW() - INTERVAL '4 days'),
    ('f1111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'b1111111-1111-4111-8111-111111111105'::uuid, 'Local Charcoal Coop',    105000.00, 'FRW', (CURRENT_DATE - INTERVAL '10 days')::date,  'PARTIALLY_PAID', NOW() - INTERVAL '40 days'),
    ('f1111111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'b1111111-1111-4111-8111-111111111101'::uuid, 'Kigali Wholesale Foods', 410000.00, 'FRW', (CURRENT_DATE - INTERVAL '50 days')::date,  'PAID',          NOW() - INTERVAL '80 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 10. Payments (IN + OUT)
-- ---------------------------------------------------------------------
INSERT INTO payments (id, tenant_id, direction, counterparty, amount, currency_code, status, created_at)
VALUES
    ('a1111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'IN',  'Kigali Cafe Ltd',         110000.00, 'FRW', 'CONFIRMED',    NOW() - INTERVAL '30 days'),
    ('a1111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'IN',  'Nyamirambo Grocers',       45000.00, 'FRW', 'CONFIRMED',    NOW() - INTERVAL '15 days'),
    ('a1111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'IN',  'Huye Catering Co',         40000.00, 'FRW', 'CONFIRMED',    NOW() - INTERVAL '5 days'),
    ('a1111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'OUT', 'Kigali Wholesale Foods',  410000.00, 'FRW', 'CONFIRMED',    NOW() - INTERVAL '50 days'),
    ('a1111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'OUT', 'Local Charcoal Coop',      60000.00, 'FRW', 'CONFIRMED',    NOW() - INTERVAL '20 days'),
    ('a1111111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'IN',  'Gisenyi Hotel Group',      80000.00, 'FRW', 'PENDING',      NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 11. Payment applications + reconciliation match items
-- ---------------------------------------------------------------------
INSERT INTO payment_applications (id, tenant_id, payment_id, target_type, target_id, applied_amount, created_at)
VALUES
    ('a1ff1111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'a1111111-1111-4111-8111-111111111101'::uuid, 'INVOICE',        'e1111111-1111-4111-8111-111111111107'::uuid, 110000.00, NOW() - INTERVAL '30 days'),
    ('a1ff1111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'a1111111-1111-4111-8111-111111111102'::uuid, 'INVOICE',        'e1111111-1111-4111-8111-111111111108'::uuid,  45000.00, NOW() - INTERVAL '15 days'),
    ('a1ff1111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'a1111111-1111-4111-8111-111111111103'::uuid, 'INVOICE',        'e1111111-1111-4111-8111-111111111106'::uuid,  40000.00, NOW() - INTERVAL '5 days'),
    ('a1ff1111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'a1111111-1111-4111-8111-111111111104'::uuid, 'SUPPLIER_BILL',  'f1111111-1111-4111-8111-111111111106'::uuid, 410000.00, NOW() - INTERVAL '50 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reconciliation_match_items (id, tenant_id, item_type, item_id, amount, matched, match_group, created_at)
VALUES
    ('ec111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'PAYMENT', 'a1111111-1111-4111-8111-111111111106'::uuid,  80000.00, FALSE, NULL,    NOW() - INTERVAL '2 days'),
    ('ec111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'INVOICE', 'e1111111-1111-4111-8111-111111111104'::uuid, 320000.00, FALSE, NULL,    NOW() - INTERVAL '1 days'),
    ('ec111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'PAYMENT', 'a1111111-1111-4111-8111-111111111101'::uuid, 110000.00, TRUE,  'MG-1',  NOW() - INTERVAL '30 days'),
    ('ec111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'INVOICE', 'e1111111-1111-4111-8111-111111111107'::uuid, 110000.00, TRUE,  'MG-1',  NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reconciliations (id, tenant_id, account_code, period, status, variance_amount, created_at)
VALUES
    ('11ec1111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '1010-CASH',      to_char(CURRENT_DATE, 'YYYY-MM'), 'IN_REVIEW',   1500.00,  NOW() - INTERVAL '2 days'),
    ('11ec1111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '1020-BANK-MOMO', to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'), 'CLOSED',      0.00,     NOW() - INTERVAL '40 days'),
    ('11ec1111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '1030-AR-CTRL',   to_char(CURRENT_DATE, 'YYYY-MM'), 'OPEN',       12500.00, NOW() - INTERVAL '1 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 12. Journal entries (general ledger samples)
-- ---------------------------------------------------------------------
INSERT INTO journal_entries (id, tenant_id, entry_date, description, debit_account, credit_account, amount, currency_code, created_at)
VALUES
    ('7e111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE - 30, 'POS daily sales summary', '1010-CASH',     '4000-SALES',           420000.00, 'FRW', NOW() - INTERVAL '30 days'),
    ('7e111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE - 28, 'Supplier payment',         '2000-AP',       '1020-BANK-MOMO',       410000.00, 'FRW', NOW() - INTERVAL '28 days'),
    ('7e111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE - 15, 'Customer receipt',         '1010-CASH',     '1100-AR',              155000.00, 'FRW', NOW() - INTERVAL '15 days'),
    ('7e111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE - 7,  'Inventory receipt',        '1300-INVENTORY','2000-AP',              850000.00, 'FRW', NOW() - INTERVAL '7 days'),
    ('7e111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE - 3,  'Salary expense',           '5100-PAYROLL',  '1020-BANK-MOMO',       350000.00, 'FRW', NOW() - INTERVAL '3 days'),
    ('7e111111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,      'Depreciation - assets',    '5400-DEPREC',   '1500-ACC-DEP',          25000.00, 'FRW', NOW())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 13. Sales orders + POS sale lines + tenders + till closes
-- Date span across last 7 days for till close history.
-- ---------------------------------------------------------------------
INSERT INTO sales_orders (id, tenant_id, customer_name, status, total_amount, currency_code, created_at, sales_channel, pos_register_code)
VALUES
    ('50000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer',  'CONFIRMED', 8500.00,  'FRW', NOW() - INTERVAL '5 days 4 hours',  'POS', 'REG-01'),
    ('50000000-0000-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer',  'CONFIRMED', 4200.00,  'FRW', NOW() - INTERVAL '4 days 6 hours',  'POS', 'REG-01'),
    ('50000000-0000-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer',  'CONFIRMED', 12500.00, 'FRW', NOW() - INTERVAL '3 days 5 hours',  'POS', 'REG-01'),
    ('50000000-0000-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer',  'CONFIRMED', 6900.00,  'FRW', NOW() - INTERVAL '2 days 3 hours',  'POS', 'REG-02'),
    ('50000000-0000-4000-8000-000000000005'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer',  'CONFIRMED', 3300.00,  'FRW', NOW() - INTERVAL '1 days 2 hours',  'POS', 'REG-02'),
    ('50000000-0000-4000-8000-000000000006'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer',  'CONFIRMED', 5000.00,  'FRW', NOW() - INTERVAL '6 hours',         'POS', 'REG-01'),
    ('50000000-0000-4000-8000-000000000007'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Kigali Cafe Ltd',   'CONFIRMED', 125000.00,'FRW', NOW() - INTERVAL '5 days',          'DIRECT', NULL),
    ('50000000-0000-4000-8000-000000000008'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Gisenyi Hotel Group','OPEN',    320000.00, 'FRW', NOW() - INTERVAL '2 days',          'DIRECT', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pos_sale_lines (id, tenant_id, sales_order_id, catalog_item_id, barcode_snapshot, product_name_snapshot, quantity, unit_price, line_total, inventory_batch_id, cost_price)
VALUES
    -- Sale 1: rice + sugar
    ('5111e111-0000-4000-8000-000000000101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000001'::uuid, '44444444-4444-4444-8444-444444444405'::uuid, '5901234123461', 'Demo Rice 5kg',         1, 8500.00, 8500.00, 'ba111111-1111-4111-8111-111111111106'::uuid, 6000.00),
    -- Sale 2: water + bread
    ('5111e111-0000-4000-8000-000000000201'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000002'::uuid, '44444444-4444-4444-8444-444444444401'::uuid, '5901234123457', 'Demo Water 500ml',      6,  500.00, 3000.00, NULL,                                          300.00),
    ('5111e111-0000-4000-8000-000000000202'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000002'::uuid, '44444444-4444-4444-8444-444444444409'::uuid, '5901234123465', 'Demo Bread Loaf',       2,  700.00, 1400.00, 'ba111111-1111-4111-8111-111111111103'::uuid, 400.00),
    -- Sale 3: airtime + eggs + drink
    ('5111e111-0000-4000-8000-000000000301'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000003'::uuid, '44444444-4444-4444-8444-444444444403'::uuid, '5901234123459', 'Demo Mobile Airtime',   5, 1000.00, 5000.00, NULL,                                          900.00),
    ('5111e111-0000-4000-8000-000000000302'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000003'::uuid, '44444444-4444-4444-8444-444444444411'::uuid, '5901234123467', 'Demo Eggs Tray (30)',   1, 5500.00, 5500.00, 'ba111111-1111-4111-8111-111111111104'::uuid, 3500.00),
    ('5111e111-0000-4000-8000-000000000303'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000003'::uuid, '44444444-4444-4444-8444-444444444412'::uuid, '5901234123468', 'Demo Soft Drink 500ml', 3,  600.00, 1800.00, 'ba111111-1111-4111-8111-111111111110'::uuid, 400.00),
    -- Sale 4: oil + sugar + drink
    ('5111e111-0000-4000-8000-000000000401'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000004'::uuid, '44444444-4444-4444-8444-444444444404'::uuid, '5901234123460', 'Demo Cooking Oil 1L',   1, 3000.00, 3000.00, 'ba111111-1111-4111-8111-111111111107'::uuid, 2400.00),
    ('5111e111-0000-4000-8000-000000000402'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000004'::uuid, '44444444-4444-4444-8444-444444444406'::uuid, '5901234123462', 'Demo Sugar 1kg',        2, 1500.00, 3000.00, 'ba111111-1111-4111-8111-111111111105'::uuid, 1100.00),
    ('5111e111-0000-4000-8000-000000000403'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000004'::uuid, '44444444-4444-4444-8444-444444444412'::uuid, '5901234123468', 'Demo Soft Drink 500ml', 1,  600.00,  600.00, 'ba111111-1111-4111-8111-111111111110'::uuid, 400.00),
    ('5111e111-0000-4000-8000-000000000404'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000004'::uuid, '44444444-4444-4444-8444-444444444407'::uuid, '5901234123463', 'Demo Soap Bar',         1,  300.00,   300.00, NULL,                                         500.00),
    -- Sale 5: tea + milk + water
    ('5111e111-0000-4000-8000-000000000501'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000005'::uuid, '44444444-4444-4444-8444-444444444408'::uuid, '5901234123464', 'Demo Tea Leaves 250g',  1, 1200.00, 1200.00, 'ba111111-1111-4111-8111-111111111108'::uuid, 800.00),
    ('5111e111-0000-4000-8000-000000000502'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000005'::uuid, '44444444-4444-4444-8444-444444444410'::uuid, '5901234123466', 'Demo Milk 1L',           2,  900.00, 1800.00, 'ba111111-1111-4111-8111-111111111101'::uuid, 600.00),
    ('5111e111-0000-4000-8000-000000000503'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000005'::uuid, '44444444-4444-4444-8444-444444444401'::uuid, '5901234123457', 'Demo Water 500ml',       1,  300.00,  300.00, NULL,                                          200.00),
    -- Sale 6 (today): water x4 + sugar x2
    ('5111e111-0000-4000-8000-000000000601'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000006'::uuid, '44444444-4444-4444-8444-444444444401'::uuid, '5901234123457', 'Demo Water 500ml',       4,  500.00, 2000.00, NULL,                                          300.00),
    ('5111e111-0000-4000-8000-000000000602'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000006'::uuid, '44444444-4444-4444-8444-444444444406'::uuid, '5901234123462', 'Demo Sugar 1kg',         2, 1500.00, 3000.00, 'ba111111-1111-4111-8111-111111111105'::uuid, 1100.00),
    -- Sale 7 (direct customer): bulk order
    ('5111e111-0000-4000-8000-000000000701'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000007'::uuid, '44444444-4444-4444-8444-444444444405'::uuid, '5901234123461', 'Demo Rice 5kg',         10, 8500.00, 85000.00, 'ba111111-1111-4111-8111-111111111106'::uuid, 6000.00),
    ('5111e111-0000-4000-8000-000000000702'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000007'::uuid, '44444444-4444-4444-8444-444444444404'::uuid, '5901234123460', 'Demo Cooking Oil 1L',   10, 3000.00, 30000.00, 'ba111111-1111-4111-8111-111111111107'::uuid, 2400.00),
    ('5111e111-0000-4000-8000-000000000703'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000007'::uuid, '44444444-4444-4444-8444-444444444408'::uuid, '5901234123464', 'Demo Tea Leaves 250g',   8, 1200.00,  9600.00, 'ba111111-1111-4111-8111-111111111108'::uuid, 800.00),
    ('5111e111-0000-4000-8000-000000000704'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000007'::uuid, '44444444-4444-4444-8444-444444444406'::uuid, '5901234123462', 'Demo Sugar 1kg',         1,  400.00,   400.00, 'ba111111-1111-4111-8111-111111111105'::uuid, 1100.00)
ON CONFLICT (id) DO NOTHING;

-- POS payment tenders (mix of CASH / MOMO / AIRTEL_MONEY / CARD / ON_ACCOUNT)
INSERT INTO pos_payment_tenders (id, tenant_id, sales_order_id, tender_type, amount, reference, payer_phone, reconciliation_status, reconciliation_source, created_at)
VALUES
    ('7e000000-0000-4000-8000-000000000101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000001'::uuid, 'CASH',         8500.00,  NULL,                       NULL,            'NA',      NULL,    NOW() - INTERVAL '5 days 4 hours'),
    ('7e000000-0000-4000-8000-000000000201'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000002'::uuid, 'MOMO',         4200.00, 'MTN-MOMO-REF-0001',         '+250788123101', 'MATCHED', 'MTN',  NOW() - INTERVAL '4 days 6 hours'),
    ('7e000000-0000-4000-8000-000000000301'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000003'::uuid, 'CASH',         7500.00,  NULL,                       NULL,            'NA',      NULL,    NOW() - INTERVAL '3 days 5 hours'),
    ('7e000000-0000-4000-8000-000000000302'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000003'::uuid, 'AIRTEL_MONEY', 5000.00, 'AIRTEL-REF-0002',           '+250733998877', 'PENDING', 'AIRTEL',NOW() - INTERVAL '3 days 5 hours'),
    ('7e000000-0000-4000-8000-000000000401'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000004'::uuid, 'CARD',         6900.00, 'CARD-AUTH-0003',            NULL,            'NA',      NULL,    NOW() - INTERVAL '2 days 3 hours'),
    ('7e000000-0000-4000-8000-000000000501'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000005'::uuid, 'MOMO',         3300.00, 'MTN-MOMO-REF-0004',         '+250788123102', 'MATCHED', 'MTN',  NOW() - INTERVAL '1 days 2 hours'),
    ('7e000000-0000-4000-8000-000000000601'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000006'::uuid, 'CASH',         5000.00,  NULL,                       NULL,            'NA',      NULL,    NOW() - INTERVAL '6 hours'),
    ('7e000000-0000-4000-8000-000000000701'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '50000000-0000-4000-8000-000000000007'::uuid, 'ON_ACCOUNT', 125000.00,  NULL,                       NULL,            'NA',      NULL,    NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- Mobile money settlement dedup record (auto-recon evidence)
INSERT INTO mobile_money_settlement_dedup (id, tenant_id, provider, external_id, outcome, response_json, created_at)
VALUES
    ('cd111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'MTN',    'MTN-MOMO-REF-0001', 'MATCHED', '{"financialTransactionId":"MTN-MOMO-REF-0001","status":"SUCCESSFUL","amount":4200,"currency":"FRW"}', NOW() - INTERVAL '4 days 5 hours'),
    ('cd111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'MTN',    'MTN-MOMO-REF-0004', 'MATCHED', '{"financialTransactionId":"MTN-MOMO-REF-0004","status":"SUCCESSFUL","amount":3300,"currency":"FRW"}', NOW() - INTERVAL '1 days')
ON CONFLICT (tenant_id, provider, external_id) DO NOTHING;

-- POS till closes - historical with various variance situations
INSERT INTO pos_till_closes (id, tenant_id, business_date, pos_register_code,
                              counted_cash, counted_momo, counted_airtel, counted_card, counted_on_account,
                              system_cash, system_momo, system_airtel, system_card, system_on_account,
                              variance_cash, variance_momo, variance_airtel, variance_card, variance_on_account,
                              notes, closed_at)
VALUES
    -- 5 days ago: perfect
    ('70cc1111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, (CURRENT_DATE - 5),  'REG-01',
     8500.00, 0.00,    0.00,    0.00,    0.00,
     8500.00, 0.00,    0.00,    0.00,    0.00,
     0.00,    0.00,    0.00,    0.00,    0.00,
     'Clean close', NOW() - INTERVAL '5 days'),
    -- 4 days ago: small cash short
    ('70cc1111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, (CURRENT_DATE - 4),  'REG-01',
     0.00,    4200.00, 0.00,    0.00,    0.00,
     0.00,    4200.00, 0.00,    0.00,    0.00,
     0.00,    0.00,    0.00,    0.00,    0.00,
     'Mobile-only day', NOW() - INTERVAL '4 days'),
    -- 3 days ago: airtel pending creates variance
    ('70cc1111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, (CURRENT_DATE - 3),  'REG-01',
     7500.00, 0.00,    5000.00, 0.00,    0.00,
     7500.00, 0.00,    5000.00, 0.00,    0.00,
     0.00,    0.00,    0.00,    0.00,    0.00,
     'Airtel callback pending - manual confirmation', NOW() - INTERVAL '3 days'),
    -- 2 days ago: card-only register
    ('70cc1111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, (CURRENT_DATE - 2),  'REG-02',
     0.00,    0.00,    0.00,    6900.00, 0.00,
     0.00,    0.00,    0.00,    6900.00, 0.00,
     0.00,    0.00,    0.00,    0.00,    0.00,
     'Cards only', NOW() - INTERVAL '2 days'),
    -- 1 day ago: variance on MoMo (counted < system)
    ('70cc1111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, (CURRENT_DATE - 1),  'REG-02',
     0.00,    3000.00, 0.00,    0.00,    0.00,
     0.00,    3300.00, 0.00,    0.00,    0.00,
     0.00,    -300.00, 0.00,    0.00,    0.00,
     'Short by 300 FRW on MoMo - investigate', NOW() - INTERVAL '1 days')
ON CONFLICT (tenant_id, business_date, pos_register_code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 14. Purchase orders
-- ---------------------------------------------------------------------
INSERT INTO purchase_orders (id, tenant_id, supplier_name, status, total_amount, currency_code, created_at)
VALUES
    ('60000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Kigali Wholesale Foods',  'RECEIVED',  850000.00, 'FRW', NOW() - INTERVAL '7 days'),
    ('60000000-0000-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Akagera Beverages',        'OPEN',     220000.00, 'FRW', NOW() - INTERVAL '20 days'),
    ('60000000-0000-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'East-African Dairy Co',   'CONFIRMED',165000.00, 'FRW', NOW() - INTERVAL '4 days'),
    ('60000000-0000-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Rwanda Office Supplies',   'OPEN',      78000.00, 'FRW', NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 15. Fixed assets + depreciation source data
-- ---------------------------------------------------------------------
INSERT INTO fixed_assets (id, tenant_id, asset_name, category, acquisition_cost, acquisition_date, useful_life_months, residual_value, status, created_at)
VALUES
    ('9a111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Shop POS Terminal #1',  'IT Hardware',    450000.00,  (CURRENT_DATE - INTERVAL '600 days')::date,  36, 50000.00,  'ACTIVE',  NOW() - INTERVAL '600 days'),
    ('9a111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Display Refrigerator',  'Equipment',     1200000.00,  (CURRENT_DATE - INTERVAL '300 days')::date,  72, 100000.00, 'ACTIVE',  NOW() - INTERVAL '300 days'),
    ('9a111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Delivery Motorbike',    'Vehicles',      2200000.00,  (CURRENT_DATE - INTERVAL '180 days')::date,  60, 200000.00, 'ACTIVE',  NOW() - INTERVAL '180 days'),
    ('9a111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Storefront Shelving',   'Furniture',      350000.00,  (CURRENT_DATE - INTERVAL '900 days')::date, 120, 25000.00,  'ACTIVE',  NOW() - INTERVAL '900 days'),
    ('9a111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Office Laptop',         'IT Hardware',    900000.00,  (CURRENT_DATE - INTERVAL '90 days')::date,   36, 80000.00,  'ACTIVE',  NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 16. HR employees + leave requests
-- ---------------------------------------------------------------------
INSERT INTO hr_employee_profiles (id, tenant_id, full_name, department, title, status, created_at)
VALUES
    ('81111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Aline Uwase',       'Sales',     'Cashier',           'ACTIVE',  NOW() - INTERVAL '730 days'),
    ('81111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Eric Habimana',     'Operations','Store Manager',     'ACTIVE',  NOW() - INTERVAL '1095 days'),
    ('81111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Diane Mukamana',    'Finance',   'Accountant',        'ACTIVE',  NOW() - INTERVAL '500 days'),
    ('81111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Patrick Niyonzima', 'Logistics', 'Driver',            'ACTIVE',  NOW() - INTERVAL '250 days'),
    ('81111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Sandrine Iradukunda','Sales',    'Cashier',           'ACTIVE',  NOW() - INTERVAL '180 days'),
    ('81111111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Olivier Manzi',     'Operations','Stock Clerk',       'ACTIVE',  NOW() - INTERVAL '120 days'),
    ('81111111-1111-4111-8111-111111111107'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Grace Ingabire',    'Marketing', 'Marketing Lead',    'ACTIVE',  NOW() - INTERVAL '60 days'),
    ('81111111-1111-4111-8111-111111111108'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Jean Bosco Karangwa','HR',       'HR Officer',        'ACTIVE',  NOW() - INTERVAL '400 days'),
    ('81111111-1111-4111-8111-111111111109'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Claudine Mutoni',   'Operations','Cleaner',           'ON_LEAVE',NOW() - INTERVAL '200 days'),
    ('81111111-1111-4111-8111-111111111110'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Alex Rutaganda',    'Sales',    'Floor Supervisor',  'TERMINATED',NOW() - INTERVAL '800 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO hr_leave_requests (id, tenant_id, employee_id, leave_type, start_date, end_date, status, created_at)
VALUES
    ('82222222-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '81111111-1111-4111-8111-111111111101'::uuid, 'ANNUAL',  CURRENT_DATE + 7,  CURRENT_DATE + 14, 'PENDING',  NOW() - INTERVAL '2 days'),
    ('82222222-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '81111111-1111-4111-8111-111111111102'::uuid, 'SICK',    CURRENT_DATE - 5,  CURRENT_DATE - 3,  'APPROVED', NOW() - INTERVAL '6 days'),
    ('82222222-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '81111111-1111-4111-8111-111111111103'::uuid, 'ANNUAL',  CURRENT_DATE + 30, CURRENT_DATE + 44, 'PENDING',  NOW() - INTERVAL '1 days'),
    ('82222222-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '81111111-1111-4111-8111-111111111109'::uuid, 'MATERNITY', CURRENT_DATE - 30, CURRENT_DATE + 60, 'APPROVED', NOW() - INTERVAL '60 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 17. Workflow rules
-- ---------------------------------------------------------------------
INSERT INTO workflow_rules (id, tenant_id, name, trigger_event, conditions_json, actions_json, active, created_at)
VALUES
    ('40f10001-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Auto-escalate high-value invoice',  'INVOICE_CREATED',
        '{"and":[{"field":"amount","op":"gt","value":200000}]}'::jsonb,
        '[{"type":"NOTIFY","role":"CFO","template":"high_value_invoice"}]'::jsonb, TRUE, NOW() - INTERVAL '30 days'),
    ('40f10001-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Notify on credit limit exceeded',   'CREDIT_LIMIT_EXCEEDED',
        '{}'::jsonb,
        '[{"type":"NOTIFY","role":"ACCOUNTING_CONTROLLER","template":"credit_limit_breach"},{"type":"BLOCK_CHECKOUT"}]'::jsonb, TRUE, NOW() - INTERVAL '20 days'),
    ('40f10001-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Low stock auto-PO suggestion',      'LOW_STOCK',
        '{"and":[{"field":"daysOfStockRemaining","op":"lt","value":7}]}'::jsonb,
        '[{"type":"QUEUE_ACTION","actionType":"DRAFT_PURCHASE_ORDER"}]'::jsonb, TRUE, NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 18. Notification rules + events + SMS delivery log
-- ---------------------------------------------------------------------
INSERT INTO notification_rules (id, tenant_id, event_type, channels_json, target_role, active, created_at)
VALUES
    ('de111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'INVOICE_OVERDUE',          '["sms","in-app","email"]'::jsonb, 'ACCOUNTING_CONTROLLER', TRUE, NOW() - INTERVAL '30 days'),
    ('de111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'LOW_STOCK',                 '["in-app"]'::jsonb,                'OPS_MANAGER',           TRUE, NOW() - INTERVAL '30 days'),
    ('de111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'POS_RECEIPT',               '["sms"]'::jsonb,                   NULL,                    TRUE, NOW() - INTERVAL '30 days'),
    ('de111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'SUPPLIER_CREDIT_LIMIT_EXCEEDED', '["sms","in-app"]'::jsonb,     'CFO',                   TRUE, NOW() - INTERVAL '10 days'),
    ('de111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'EXPIRY_RISK',               '["in-app","email"]'::jsonb,        'OPS_MANAGER',           TRUE, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_events (id, tenant_id, event_type, payload, status, created_at)
VALUES
    ('df111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'INVOICE_OVERDUE', '{"invoiceId":"e1111111-1111-4111-8111-111111111104","customer":"Gisenyi Hotel Group","amount":320000,"daysOverdue":45,"phoneNumber":"+250788111104"}'::jsonb, 'DELIVERED', NOW() - INTERVAL '10 days'),
    ('df111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'INVOICE_OVERDUE', '{"invoiceId":"e1111111-1111-4111-8111-111111111105","customer":"Musanze Bistro","amount":145000,"daysOverdue":120,"phoneNumber":"+250788111106"}'::jsonb, 'DELIVERED', NOW() - INTERVAL '30 days'),
    ('df111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'LOW_STOCK',       '{"productName":"Demo Sugar 1kg","onHand":3,"reorderPoint":10}'::jsonb,                                                                            'DELIVERED', NOW() - INTERVAL '2 days'),
    ('df111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'LOW_STOCK',       '{"productName":"Demo Eggs Tray (30)","onHand":4,"reorderPoint":6}'::jsonb,                                                                          'DELIVERED', NOW() - INTERVAL '1 days'),
    ('df111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'EXPIRY_RISK',     jsonb_build_object('productName','Demo Bread Loaf','lotCode','BREAD-T','expiryDate',(CURRENT_DATE + INTERVAL '2 days')::date,'quantityOnHand',6), 'PENDING', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_sms_delivery_log (id, tenant_id, notification_event_id, event_type, recipient_phone, status, response_code, error_message, created_at)
VALUES
    ('501501de-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'df111111-1111-4111-8111-111111111101'::uuid, 'INVOICE_OVERDUE', '+250788111104', 'SENT',    200, NULL,                        NOW() - INTERVAL '10 days'),
    ('501501de-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'df111111-1111-4111-8111-111111111102'::uuid, 'INVOICE_OVERDUE', '+250788111106', 'DRY_RUN', NULL, NULL,                        NOW() - INTERVAL '30 days'),
    ('501501de-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'df111111-1111-4111-8111-111111111101'::uuid, 'INVOICE_OVERDUE', '+250788000000', 'FAILED',  502, 'provider timeout',          NOW() - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 19. Action queue (mixed states - includes approval-gated rows)
-- ---------------------------------------------------------------------
INSERT INTO action_queue (id, tenant_id, action_type, action_ref, payload, status, created_at, approval_status, approval_expires_at)
VALUES
    ('acff1111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'CHASE_OVERDUE_INVOICE', 'e1111111-1111-4111-8111-111111111104',
        '{"customer":"Gisenyi Hotel Group","amount":320000,"daysOverdue":45}'::jsonb, 'PENDING', NOW() - INTERVAL '2 days', 'NOT_REQUIRED', NULL),
    ('acff1111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'DRAFT_PURCHASE_ORDER',  '22222222-2222-4222-8222-222222222206',
        '{"productName":"Demo Sugar 1kg","suggestedQuantity":50,"supplier":"Kigali Wholesale Foods"}'::jsonb, 'PENDING_APPROVAL', NOW() - INTERVAL '1 days', 'PENDING', NOW() + INTERVAL '30 minutes'),
    ('acff1111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'WRITE_OFF_EXPIRED',     'ba111111-1111-4111-8111-111111111103',
        '{"lotCode":"BREAD-T","quantity":6}'::jsonb, 'PENDING_APPROVAL', NOW() - INTERVAL '6 hours', 'PENDING', NOW() + INTERVAL '1 hours'),
    ('acff1111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'ESCALATE_TO_CFO',       'e1111111-1111-4111-8111-111111111105',
        '{"customer":"Musanze Bistro","amount":145000,"daysOverdue":120}'::jsonb, 'COMPLETED', NOW() - INTERVAL '30 days', 'NOT_REQUIRED', NULL)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 20. Tax profiles (Rwanda VAT + variants)
-- ---------------------------------------------------------------------
INSERT INTO tax_profiles (id, tenant_id, country_code, tax_code, rate, active, created_at)
VALUES
    ('7a111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'RWA', 'VAT_STANDARD',  18.00, TRUE, NOW() - INTERVAL '180 days'),
    ('7a111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'RWA', 'VAT_ZERO',       0.00, TRUE, NOW() - INTERVAL '180 days'),
    ('7a111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'RWA', 'WHT_SERVICES',  15.00, TRUE, NOW() - INTERVAL '180 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 21. Scenario templates (one per role) for the scenario library
-- ---------------------------------------------------------------------
INSERT INTO scenario_templates (id, tenant_id, role, name, assumptions_json, created_at)
VALUES
    ('5cef1111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'CEO',                   'Q3 expansion plan',          '{"revenueGrowthPct":15,"newStores":2,"hiringCount":4}'::jsonb, NOW() - INTERVAL '40 days'),
    ('5cef1111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'CFO',                   'Reduce AR aging by 20%',     '{"collectionAccelerationDays":7,"creditPolicyTightenedPct":10}'::jsonb, NOW() - INTERVAL '20 days'),
    ('5cef1111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'SALES_MANAGER',         'Holiday season uplift',      '{"promoDiscountPct":10,"footTrafficUpliftPct":25}'::jsonb, NOW() - INTERVAL '10 days'),
    ('5cef1111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'OPS_MANAGER',           'Faster restock cycle',       '{"reorderPointBumpPct":10,"safetyStockDays":3}'::jsonb, NOW() - INTERVAL '5 days'),
    ('5cef1111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'HR_MANAGER',            'Reduce overtime by 30%',     '{"overtimeReductionPct":30,"newHires":2}'::jsonb, NOW() - INTERVAL '3 days'),
    ('5cef1111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'MARKETING_MANAGER',     'SMS broadcast campaign',     '{"smsBudgetFRW":50000,"expectedConversionPct":4}'::jsonb, NOW() - INTERVAL '1 days'),
    ('5cef1111-1111-4111-8111-111111111107'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'ACCOUNTING_CONTROLLER', 'Month-end fast close',       '{"targetCloseDays":5,"automatedReconciliationsPct":75}'::jsonb, NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 22. Tenant feature flags
-- ---------------------------------------------------------------------
INSERT INTO tenant_feature_flags (id, tenant_id, feature_key, enabled, updated_at)
VALUES
    ('bef11111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'COPILOT_AGENT',              TRUE,  NOW()),
    ('bef11111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'RRA_RWANDA_EIS',             TRUE,  NOW()),
    ('bef11111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'POS_MOBILE_MONEY',           TRUE,  NOW()),
    ('bef11111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'BARCODE_LABEL_PRINTING',     TRUE,  NOW()),
    ('bef11111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'SMS_NOTIFICATIONS',          TRUE,  NOW()),
    ('bef11111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'MULTI_CURRENCY',             TRUE,  NOW()),
    ('bef11111-1111-4111-8111-111111111107'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'EXPERIMENTAL_FORECAST_V2',   FALSE, NOW())
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 23. Tenant plugins (marketplace)
-- ---------------------------------------------------------------------
INSERT INTO tenant_plugins (id, tenant_id, plugin_key, version, enabled, created_at)
VALUES
    ('91ff1111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'rra-eis-rwanda',  '1.2.0', TRUE, NOW() - INTERVAL '60 days'),
    ('91ff1111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'pos-thermal',     '0.9.3', TRUE, NOW() - INTERVAL '40 days'),
    ('91ff1111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'momo-mtn',        '1.0.5', TRUE, NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 24. FX rates (FRW <-> USD/EUR/KES/UGX)
-- ---------------------------------------------------------------------
INSERT INTO fx_rates (id, tenant_id, base_currency, quote_currency, rate, source, as_of_date, created_at)
VALUES
    ('f3111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'USD', 'FRW',  1320.00000000, 'manual',     CURRENT_DATE, NOW()),
    ('f3111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'EUR', 'FRW',  1420.00000000, 'manual',     CURRENT_DATE, NOW()),
    ('f3111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'KES', 'FRW',     8.75000000, 'manual',     CURRENT_DATE, NOW()),
    ('f3111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'UGX', 'FRW',     0.36000000, 'manual',     CURRENT_DATE, NOW()),
    ('f3111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'USD', 'FRW',  1310.00000000, 'manual',     CURRENT_DATE - 7, NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 25. Webhook subscriptions
-- ---------------------------------------------------------------------
INSERT INTO webhook_subscriptions (id, tenant_id, callback_url, event_type, secret, active, created_at)
VALUES
    ('cb111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'https://example.invalid/hooks/invoices',  'invoice.created',  'demo-secret-1', TRUE,  NOW() - INTERVAL '30 days'),
    ('cb111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'https://example.invalid/hooks/inventory', 'inventory.low_stock','demo-secret-2', TRUE, NOW() - INTERVAL '20 days'),
    ('cb111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'https://example.invalid/hooks/disabled',  'sale.created',     'demo-secret-3', FALSE, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webhook_delivery_log (id, tenant_id, subscription_id, event_type, payload, status, response_code, retry_count, signature, created_at)
VALUES
    ('cbd11111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'cb111111-1111-4111-8111-111111111101'::uuid, 'invoice.created',   '{"invoiceId":"e1111111-1111-4111-8111-111111111101"}'::jsonb, 'DELIVERED', 200, 0, 'demo-hmac-sig-1', NOW() - INTERVAL '5 days'),
    ('cbd11111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'cb111111-1111-4111-8111-111111111102'::uuid, 'inventory.low_stock','{"productName":"Demo Sugar 1kg"}'::jsonb,                  'FAILED',    502, 2, 'demo-hmac-sig-2', NOW() - INTERVAL '1 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 26. Anomaly cases + dashboard anomaly feed (every role gets one)
-- ---------------------------------------------------------------------
INSERT INTO anomaly_cases (id, tenant_id, affected_role, severity, title, details, status, kpi_name, current_value, expected_range, z_score, contributors_json, created_at)
VALUES
    ('aa111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'CFO',                   'HIGH',   'AR aging spike',              'Open AR over 60 days is 21% above 30-day baseline.', 'OPEN', 'ar_overdue_60_plus', 465000.00, '0-200000',  2.8, '[{"customer":"Gisenyi Hotel Group","contributionPct":68}]'::jsonb, NOW() - INTERVAL '2 days'),
    ('aa111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'OPS_MANAGER',           'MEDIUM', 'Multiple low-stock SKUs',     '3 SKUs at/below reorder point in last 24h.',         'OPEN', 'low_stock_count',      3.00, '0-1',       2.2, '[{"product":"Demo Sugar 1kg"},{"product":"Demo Eggs Tray (30)"},{"product":"Demo Bread Loaf"}]'::jsonb, NOW() - INTERVAL '1 days'),
    ('aa111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'SALES_MANAGER',         'LOW',    'Sales velocity dip',          'Daily POS revenue fell 12% vs last 7d avg.',         'OPEN', 'daily_revenue',       18900.00, '22000-30000', 1.5, '[{"register":"REG-02","contributionPct":40}]'::jsonb, NOW() - INTERVAL '6 hours'),
    ('aa111111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'ACCOUNTING_CONTROLLER', 'HIGH',   'Cash recon variance',         'Unmatched bank line in 1010-CASH.',                  'OPEN', 'recon_variance',       1500.00, '0-100',     3.1, '[{"reconciliationId":"11ec1111-1111-4111-8111-111111111101"}]'::jsonb, NOW() - INTERVAL '2 days'),
    ('aa111111-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'HR_MANAGER',            'LOW',    'Headcount onboarding lag',    'New hire onboarding tasks > SLA.',                   'OPEN', 'onboarding_breaches', 1.00,     '0-0',        1.2, '[]'::jsonb, NOW() - INTERVAL '3 days'),
    ('aa111111-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'MARKETING_MANAGER',     'LOW',    'CAC creeping up',             'Cost per acquisition above 7-day average.',          'OPEN', 'cac',                  4200.00, '2500-3500', 1.4, '[]'::jsonb, NOW() - INTERVAL '4 days'),
    ('aa111111-1111-4111-8111-111111111107'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'CEO',                   'MEDIUM', 'Cash runway compression',     'Cash runway ~9 weeks (vs 14w plan).',                'OPEN', 'cash_runway_weeks',    9.00,    '12-16',     2.0, '[]'::jsonb, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO anomaly_detection_feed (id, tenant_id, affected_role, severity, title, explanation, created_at)
VALUES
    ('aade1111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'CFO',                   'HIGH',   'AR aging spike',          'Overdue 60+ AR has grown 21% week-over-week.',          NOW() - INTERVAL '2 days'),
    ('aade1111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'OPS_MANAGER',           'MEDIUM', 'Low-stock cluster',       '3 SKUs at/below reorder. Auto-PO suggestion drafted.', NOW() - INTERVAL '1 days'),
    ('aade1111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'SALES_MANAGER',         'LOW',    'Sales dip',                'Sales pace below 7-day average.',                       NOW() - INTERVAL '6 hours'),
    ('aade1111-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'ACCOUNTING_CONTROLLER', 'HIGH',   'Cash recon variance',     '1010-CASH line not yet matched.',                       NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 27. Close tasks (current month workflow)
-- ---------------------------------------------------------------------
INSERT INTO close_tasks (id, tenant_id, period, task_key, owner_role, status, depends_on_json, risk_score, created_at, completed_at)
VALUES
    ('c10001ff-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, to_char(CURRENT_DATE, 'YYYY-MM'), 'cash_recon',           'ACCOUNTING_CONTROLLER', 'IN_PROGRESS', '[]'::jsonb,                              1.5, NOW() - INTERVAL '3 days', NULL),
    ('c10001ff-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, to_char(CURRENT_DATE, 'YYYY-MM'), 'ar_aging_review',      'ACCOUNTING_CONTROLLER', 'OPEN',        '["cash_recon"]'::jsonb,                  2.0, NOW() - INTERVAL '3 days', NULL),
    ('c10001ff-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, to_char(CURRENT_DATE, 'YYYY-MM'), 'ap_cutoff',            'CFO',                   'OPEN',        '[]'::jsonb,                              1.0, NOW() - INTERVAL '3 days', NULL),
    ('c10001ff-1111-4111-8111-111111111104'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, to_char(CURRENT_DATE, 'YYYY-MM'), 'inventory_count',      'OPS_MANAGER',           'OPEN',        '[]'::jsonb,                              1.5, NOW() - INTERVAL '3 days', NULL),
    ('c10001ff-1111-4111-8111-111111111105'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, to_char(CURRENT_DATE, 'YYYY-MM'), 'depreciation_run',     'ACCOUNTING_CONTROLLER', 'OPEN',        '["inventory_count"]'::jsonb,             1.0, NOW() - INTERVAL '3 days', NULL),
    ('c10001ff-1111-4111-8111-111111111106'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, to_char(CURRENT_DATE, 'YYYY-MM'), 'fx_revaluation',       'CFO',                   'OPEN',        '[]'::jsonb,                              0.5, NOW() - INTERVAL '3 days', NULL),
    ('c10001ff-1111-4111-8111-111111111107'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, to_char(CURRENT_DATE, 'YYYY-MM'), 'final_post_to_gl',     'CFO',                   'OPEN',        '["ar_aging_review","ap_cutoff","depreciation_run","fx_revaluation"]'::jsonb, 3.0, NOW() - INTERVAL '3 days', NULL),
    ('c10001ff-1111-4111-8111-111111111108'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'), 'final_post_to_gl', 'CFO',  'COMPLETED', '[]'::jsonb, 0.0, NOW() - INTERVAL '32 days', NOW() - INTERVAL '25 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 28. Dashboard snapshots (one row per role for the demo tenant today)
-- ---------------------------------------------------------------------
INSERT INTO ceo_kpi_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object(
            'revenueMonthFRW',    4250000,
            'grossMarginPct',     32.5,
            'cashRunwayWeeks',    9,
            'activeCustomers',    7,
            'storesActive',       1,
            'aiInsights', jsonb_build_array(
                'AR aging exposure is concentrated in 2 customers.',
                'Stock at risk: 3 SKUs near reorder; 2 lots near expiry.'
            )
        ))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

INSERT INTO cfo_financial_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object(
            'cashOnHandFRW',          2150000,
            'arOverdueFRW',            530000,
            'apOverdueFRW',            298000,
            'quickRatio',              1.4,
            'closeTasksOutstanding',   6
        ))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

INSERT INTO cfo_kpi_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object(
            'workingCapitalFRW',  3200000,
            'daysSalesOutstanding', 28,
            'daysPayableOutstanding', 22
        ))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

INSERT INTO sales_kpi_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object(
            'dailyRevenueFRW', 22500,
            'avgBasketFRW',    5400,
            'topProduct',      'Demo Rice 5kg',
            'pipelineOpenFRW', 320000
        ))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

INSERT INTO sales_pipeline_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object('openOrders', 1, 'openOrderValueFRW', 320000, 'avgCloseDays', 12))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

INSERT INTO ops_kpi_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object(
            'lowStockSkus',     3,
            'expiryRiskLots',   2,
            'todaysOrders',     6,
            'fulfillmentRate',  0.99
        ))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

INSERT INTO ops_efficiency_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object('avgRestockLeadDays', 4.5, 'tillVariancesThisWeek', 1, 'stockoutsThisWeek', 0))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

INSERT INTO hr_workforce_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object(
            'activeHeadcount', 8,
            'onLeave',         1,
            'openLeaveRequests', 2,
            'attritionLast12mPct', 8.0
        ))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

INSERT INTO marketing_roi_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object(
            'cacFRW',     4200,
            'ltvFRW',     38000,
            'ltvCacRatio', 9.05,
            'smsSentLast7d', 12
        ))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

INSERT INTO accounting_close_snapshot (tenant_id, snapshot_date, payload)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
        jsonb_build_object(
            'period',                to_char(CURRENT_DATE, 'YYYY-MM'),
            'tasksOpen',             6,
            'tasksCompleted',        1,
            'criticalPathBlockedBy', 'ar_aging_review'
        ))
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

-- ---------------------------------------------------------------------
-- 29. AR/AP aging snapshot (matches invoice/bill demo data above)
-- ---------------------------------------------------------------------
INSERT INTO ar_ap_aging_snapshot (
    tenant_id, snapshot_date,
    receivable_current, receivable_30, receivable_60, receivable_90_plus,
    payable_current, payable_30, payable_60, payable_90_plus)
VALUES (
    '11111111-1111-4111-8111-111111111111'::uuid, CURRENT_DATE,
    207500.00, 65000.00, 320000.00, 145000.00,
    1015000.00, 220000.00,   0.00,    78000.00
)
ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;

-- ---------------------------------------------------------------------
-- 30. Rwanda RRA settings + sample EIS submission + draft tax filing
-- ---------------------------------------------------------------------
INSERT INTO rra_rwanda_settings (tenant_id, tin, company_trade_name, vat_registered, turnover_exceeds_vat_threshold, amounts_tax_inclusive, eis_integration_enabled, notes, created_at, updated_at)
VALUES ('11111111-1111-4111-8111-111111111111'::uuid, '100123456', 'Demo Retail Co', TRUE, TRUE, FALSE, TRUE, 'Demo setup for EIS.', NOW(), NOW())
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO rra_eis_submissions (id, tenant_id, invoice_id, status, request_payload, response_payload, rra_reference, http_status, created_at, completed_at)
VALUES
    ('44a11111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'e1111111-1111-4111-8111-111111111101'::uuid, 'ACK',     '{"invoiceId":"e1111111-1111-4111-8111-111111111101","amount":125000}', '{"rraRef":"RRA-EIS-A1"}',  'RRA-EIS-A1', 200, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    ('44a11111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'e1111111-1111-4111-8111-111111111102'::uuid, 'PENDING', '{"invoiceId":"e1111111-1111-4111-8111-111111111102","amount":82500}',  NULL,                       NULL,         NULL, NOW() - INTERVAL '1 days', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rra_tax_filings (id, tenant_id, filing_type, period, status, due_date, draft_payload, submitted_payload, rra_ack_reference, created_at, updated_at, submitted_at)
VALUES
    ('44f11111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'VAT', to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
     'SUBMITTED',
     (CURRENT_DATE - INTERVAL '1 month' + INTERVAL '15 days')::date,
     '{"outputVATFRW":45000,"inputVATFRW":18000}',
     '{"outputVATFRW":45000,"inputVATFRW":18000,"netVATFRW":27000}',
     'RRA-VAT-ACK-1',
     NOW() - INTERVAL '40 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
    ('44f11111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'VAT', to_char(CURRENT_DATE, 'YYYY-MM'),
     'DRAFT',
     (CURRENT_DATE + INTERVAL '1 month' + INTERVAL '15 days')::date,
     '{"outputVATFRW":52000,"inputVATFRW":21000}',
     NULL,
     NULL,
     NOW(), NOW(), NULL)
ON CONFLICT (tenant_id, filing_type, period) DO NOTHING;

-- ---------------------------------------------------------------------
-- 31. Tenant data sharing (incoming grant from partner tenant)
-- ---------------------------------------------------------------------
INSERT INTO tenant_data_sharing_grants (id, source_tenant_id, target_tenant_id, resource_type, scope, status, created_by, created_at)
VALUES
    ('da111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111112'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'PRODUCT_CATALOG', 'READ', 'ACTIVE', '33333333-3333-4333-8333-333333333301'::uuid, NOW() - INTERVAL '30 days'),
    ('da111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '11111111-1111-4111-8111-111111111112'::uuid, 'PRICELIST',       'READ', 'ACTIVE', '33333333-3333-4333-8333-333333333301'::uuid, NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 32. Tenant custom fields + values
-- ---------------------------------------------------------------------
INSERT INTO tenant_custom_fields (id, tenant_id, entity_type, field_key, field_type, options, required)
VALUES
    ('cf111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'CUSTOMER', 'loyalty_tier',  'ENUM',   '{"values":["BRONZE","SILVER","GOLD"]}'::jsonb, FALSE),
    ('cf111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'PRODUCT',  'origin_country','STRING', NULL,                                            FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO custom_field_values (id, tenant_id, entity_type, entity_id, field_key, field_value, created_at)
VALUES
    ('cf111111-1111-4111-8111-111111111171'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'CUSTOMER', 'c1111111-1111-4111-8111-111111111101'::uuid, 'loyalty_tier',  '"GOLD"'::jsonb,   NOW() - INTERVAL '60 days'),
    ('cf111111-1111-4111-8111-111111111172'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'CUSTOMER', 'c1111111-1111-4111-8111-111111111102'::uuid, 'loyalty_tier',  '"SILVER"'::jsonb, NOW() - INTERVAL '50 days'),
    ('cf111111-1111-4111-8111-111111111173'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'PRODUCT',  '22222222-2222-4222-8222-222222222205'::uuid, 'origin_country','"Tanzania"'::jsonb, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 33. Audit log (one tenant-scoped chain entry; future writes append)
-- ---------------------------------------------------------------------
INSERT INTO audit_log (id, tenant_id, user_id, action, entity_type, old_value, new_value, previous_hash, record_hash, created_at)
VALUES
    ('a0111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333302'::uuid,
     'CREATE', 'invoice', NULL, '{"id":"e1111111-1111-4111-8111-111111111101","amount":125000}',
     '0000000000000000000000000000000000000000000000000000000000000000',
     'a1' || repeat('0', 62), NOW() - INTERVAL '5 days'),
    ('a0111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333307'::uuid,
     'UPDATE', 'invoice', '{"status":"OPEN"}', '{"status":"PAID"}',
     'a1' || repeat('0', 62),
     'a2' || repeat('0', 62), NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 34. Copilot agent runs + steps (recent + historical, mixed status)
-- ---------------------------------------------------------------------
INSERT INTO copilot_agent_runs (id, tenant_id, user_id, role, question, prompt_version, status, plan_json, response_json, created_at, completed_at)
VALUES
    ('c0111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333302'::uuid, 'CFO',           'How is our AR aging trending this month?', 'copilot-rag-v1', 'COMPLETED',
     '["RETRIEVE_CONTEXT","TOOL_ARAP_AGING","SYNTHESIZE"]'::jsonb,
     '{"answer":"AR overdue is concentrated in 2 customers (~89% of >60d).","confidence":0.87}'::jsonb,
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '6 seconds'),
    ('c0111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333304'::uuid, 'OPS_MANAGER',   'Which products are at low-stock risk?',     'copilot-rag-v1', 'COMPLETED',
     '["RETRIEVE_CONTEXT","TOOL_INVENTORY_RISK","SYNTHESIZE"]'::jsonb,
     '{"answer":"3 SKUs at/below reorder: Sugar, Eggs, Bread.","confidence":0.91}'::jsonb,
     NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days' + INTERVAL '5 seconds'),
    ('c0111111-1111-4111-8111-111111111103'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333303'::uuid, 'SALES_MANAGER', 'action: escalate overdue invoices',          'copilot-rag-v1', 'COMPLETED',
     '["RETRIEVE_CONTEXT","TOOL_ACTION_QUEUE_ENQUEUE","SYNTHESIZE"]'::jsonb,
     '{"answer":"Queued 1 escalation action awaiting approval.","confidence":0.80}'::jsonb,
     NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours' + INTERVAL '8 seconds')
ON CONFLICT (id) DO NOTHING;

INSERT INTO copilot_agent_steps (id, run_id, step_no, step_type, status, detail_json, created_at)
VALUES
    ('c0111e11-1111-4111-8111-111111111101'::uuid, 'c0111111-1111-4111-8111-111111111101'::uuid, 1, 'RETRIEVE_CONTEXT',    'COMPLETED', '{"docs":3}'::jsonb,                    NOW() - INTERVAL '2 days'),
    ('c0111e11-1111-4111-8111-111111111102'::uuid, 'c0111111-1111-4111-8111-111111111101'::uuid, 2, 'TOOL_ARAP_AGING',     'COMPLETED', '{"overdue60Plus":465000}'::jsonb,      NOW() - INTERVAL '2 days'),
    ('c0111e11-1111-4111-8111-111111111103'::uuid, 'c0111111-1111-4111-8111-111111111101'::uuid, 3, 'SYNTHESIZE',          'COMPLETED', '{"confidence":0.87}'::jsonb,           NOW() - INTERVAL '2 days'),
    ('c0111e11-1111-4111-8111-111111111201'::uuid, 'c0111111-1111-4111-8111-111111111102'::uuid, 1, 'RETRIEVE_CONTEXT',    'COMPLETED', '{"docs":2}'::jsonb,                    NOW() - INTERVAL '1 days'),
    ('c0111e11-1111-4111-8111-111111111202'::uuid, 'c0111111-1111-4111-8111-111111111102'::uuid, 2, 'TOOL_INVENTORY_RISK', 'COMPLETED', '{"lowStockSkus":3}'::jsonb,            NOW() - INTERVAL '1 days'),
    ('c0111e11-1111-4111-8111-111111111203'::uuid, 'c0111111-1111-4111-8111-111111111102'::uuid, 3, 'SYNTHESIZE',          'COMPLETED', '{"confidence":0.91}'::jsonb,           NOW() - INTERVAL '1 days'),
    ('c0111e11-1111-4111-8111-111111111301'::uuid, 'c0111111-1111-4111-8111-111111111103'::uuid, 1, 'RETRIEVE_CONTEXT',          'COMPLETED',        '{"docs":1}'::jsonb,    NOW() - INTERVAL '6 hours'),
    ('c0111e11-1111-4111-8111-111111111302'::uuid, 'c0111111-1111-4111-8111-111111111103'::uuid, 2, 'TOOL_ACTION_QUEUE_ENQUEUE', 'PENDING_APPROVAL', '{"actionId":"acff1111-1111-4111-8111-111111111102"}'::jsonb, NOW() - INTERVAL '6 hours'),
    ('c0111e11-1111-4111-8111-111111111303'::uuid, 'c0111111-1111-4111-8111-111111111103'::uuid, 3, 'SYNTHESIZE',                'COMPLETED',        '{"confidence":0.80}'::jsonb, NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO copilot_agent_audit_log (id, tenant_id, user_id, run_id, event_type, payload_json, previous_hash, record_hash, created_at)
VALUES
    ('c0aa1111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333302'::uuid, 'c0111111-1111-4111-8111-111111111101'::uuid,
     'RUN_STARTED',   '{"role":"CFO"}'::jsonb,
     '0000000000000000000000000000000000000000000000000000000000000000',
     'cc01' || repeat('0', 60), NOW() - INTERVAL '2 days'),
    ('c0aa1111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333302'::uuid, 'c0111111-1111-4111-8111-111111111101'::uuid,
     'RUN_COMPLETED', '{"status":"COMPLETED"}'::jsonb,
     'cc01' || repeat('0', 60),
     'cc02' || repeat('0', 60), NOW() - INTERVAL '2 days' + INTERVAL '6 seconds')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 35. Forecast jobs (one historic success + one queued)
-- ---------------------------------------------------------------------
INSERT INTO forecast_jobs (id, tenant_id, requested_by, metric, status, result_json, created_at, started_at, completed_at)
VALUES
    ('f0111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333302'::uuid, 'revenue_30d',  'COMPLETED', '{"horizonDays":30,"projection":[22000,21800,22500,23000]}'::jsonb, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 seconds', NOW() - INTERVAL '2 days' + INTERVAL '12 seconds'),
    ('f0111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333302'::uuid, 'cashflow_60d', 'QUEUED',    NULL,                                                              NOW() - INTERVAL '10 minutes', NULL,                                          NULL)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 36. Service account API keys (visible in admin keys list; never used for auth)
-- ---------------------------------------------------------------------
INSERT INTO service_account_api_keys (id, tenant_id, service_user_id, service_account_name, key_prefix, key_hash, scopes_csv, active, expires_at, created_at)
VALUES
    ('5e111111-1111-4111-8111-111111111101'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333304'::uuid, 'momo-webhook-service', 'sk_momo_',  'demo-not-a-real-hash-1', 'pos:webhook,inventory:read',           TRUE,  NOW() + INTERVAL '365 days', NOW() - INTERVAL '30 days'),
    ('5e111111-1111-4111-8111-111111111102'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333304'::uuid, 'analytics-export',     'sk_anlx_', 'demo-not-a-real-hash-2', 'finance:read,inventory:read',          FALSE, NOW() + INTERVAL '180 days', NOW() - INTERVAL '60 days')
ON CONFLICT (id) DO NOTHING;
