-- =====================================================================
-- V60: Demo sales & finance activity for tenant 11111111-1111-4111-8111-111111111111
--
-- Goals:
--   * CEO dashboard KPIs use live paid-invoice math (~+8% revenue growth, gross margin %)
--   * Copilot TOOL_DASHBOARD_KPI returns meaningful numbers for demos
--   * Snapshot read-models carry realistic FRW figures for CFO/Sales/Ops
--
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING / DO UPDATE.
-- Does not modify V40/V41 rows except snapshot upserts for today's date.
-- =====================================================================

-- Demo tenant only
-- 11111111-1111-4111-8111-111111111111

SELECT set_config('app.tenant_id', '11111111-1111-4111-8111-111111111111', true);

-- ---------------------------------------------------------------------
-- 1. Prior-period PAID invoices (days 31–60) — baseline ~11.5M FRW
-- ---------------------------------------------------------------------
INSERT INTO invoices (id, tenant_id, customer_id, customer_name, amount, currency_code, due_date, status, created_at)
VALUES
    ('d6010001-0001-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111101'::uuid, 'Kigali Cafe Ltd',       2800000.00, 'FRW', (CURRENT_DATE - 45)::date, 'PAID', NOW() - INTERVAL '45 days'),
    ('d6010001-0001-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111104'::uuid, 'Gisenyi Hotel Group',   3200000.00, 'FRW', (CURRENT_DATE - 42)::date, 'PAID', NOW() - INTERVAL '42 days'),
    ('d6010001-0001-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111107'::uuid, 'Huye Catering Co',    1950000.00, 'FRW', (CURRENT_DATE - 38)::date, 'PAID', NOW() - INTERVAL '38 days'),
    ('d6010001-0001-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111102'::uuid, 'Nyamirambo Grocers',    1850000.00, 'FRW', (CURRENT_DATE - 35)::date, 'PAID', NOW() - INTERVAL '35 days'),
    ('d6010001-0001-4000-8000-000000000005'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111101'::uuid, 'Kigali Cafe Ltd',       1700000.00, 'FRW', (CURRENT_DATE - 32)::date, 'PAID', NOW() - INTERVAL '32 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Current-period PAID invoices (last 30 days) — ~12.45M FRW (~+8.3% vs prior)
-- ---------------------------------------------------------------------
INSERT INTO invoices (id, tenant_id, customer_id, customer_name, amount, currency_code, due_date, status, created_at)
VALUES
    ('d6010002-0001-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111101'::uuid, 'Kigali Cafe Ltd',       3100000.00, 'FRW', (CURRENT_DATE - 18)::date, 'PAID', NOW() - INTERVAL '18 days'),
    ('d6010002-0001-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111104'::uuid, 'Gisenyi Hotel Group',   3450000.00, 'FRW', (CURRENT_DATE - 14)::date, 'PAID', NOW() - INTERVAL '14 days'),
    ('d6010002-0001-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111107'::uuid, 'Huye Catering Co',      2100000.00, 'FRW', (CURRENT_DATE - 10)::date, 'PAID', NOW() - INTERVAL '10 days'),
    ('d6010002-0001-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111102'::uuid, 'Nyamirambo Grocers',    1950000.00, 'FRW', (CURRENT_DATE - 7)::date,  'PAID', NOW() - INTERVAL '7 days'),
    ('d6010002-0001-4000-8000-000000000005'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111103'::uuid, 'Remera School Canteen',  950000.00, 'FRW', (CURRENT_DATE - 5)::date,  'PAID', NOW() - INTERVAL '5 days'),
    ('d6010002-0001-4000-8000-000000000006'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111101'::uuid, 'Kigali Cafe Ltd',       1200000.00, 'FRW', (CURRENT_DATE - 3)::date,  'PAID', NOW() - INTERVAL '3 days'),
    ('d6010002-0001-4000-8000-000000000007'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111105'::uuid, 'Walk-in Customer',       800000.00, 'FRW', (CURRENT_DATE - 2)::date,  'PAID', NOW() - INTERVAL '2 days'),
    ('d6010002-0001-4000-8000-000000000008'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'c1111111-1111-4111-8111-111111111102'::uuid, 'Nyamirambo Grocers',    1000000.00, 'FRW', (CURRENT_DATE - 1)::date,  'PAID', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Matching inbound payments (supports cash-runway proxy)
INSERT INTO payments (id, tenant_id, direction, counterparty, amount, currency_code, status, created_at)
VALUES
    ('d6010003-0001-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'IN', 'Kigali Cafe Ltd',       3100000.00, 'FRW', 'CONFIRMED', NOW() - INTERVAL '18 days'),
    ('d6010003-0001-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'IN', 'Gisenyi Hotel Group',   3450000.00, 'FRW', 'CONFIRMED', NOW() - INTERVAL '14 days'),
    ('d6010003-0001-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'IN', 'Huye Catering Co',      2100000.00, 'FRW', 'CONFIRMED', NOW() - INTERVAL '10 days'),
    ('d6010003-0001-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'IN', 'Nyamirambo Grocers',    2950000.00, 'FRW', 'CONFIRMED', NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Recent POS sales (this week) — extends V41 catalog
-- ---------------------------------------------------------------------
INSERT INTO sales_orders (id, tenant_id, customer_name, status, total_amount, currency_code, created_at, sales_channel, pos_register_code)
VALUES
    ('d6010004-0001-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer', 'CONFIRMED', 18700.00, 'FRW', NOW() - INTERVAL '2 days 3 hours', 'POS', 'REG-01'),
    ('d6010004-0001-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer', 'CONFIRMED', 14200.00, 'FRW', NOW() - INTERVAL '1 day 4 hours',  'POS', 'REG-01'),
    ('d6010004-0001-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Walk-in Customer', 'CONFIRMED', 22100.00, 'FRW', NOW() - INTERVAL '4 hours',        'POS', 'REG-02'),
    ('d6010004-0001-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Kigali Cafe Ltd',    'CONFIRMED', 42500.00, 'FRW', NOW() - INTERVAL '2 hours',        'POS', 'REG-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pos_sale_lines (id, tenant_id, sales_order_id, catalog_item_id, barcode_snapshot, product_name_snapshot, quantity, unit_price, line_total, inventory_batch_id, cost_price)
VALUES
    ('d6010005-0001-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'd6010004-0001-4000-8000-000000000001'::uuid, '44444444-4444-4444-8444-444444444405'::uuid, '5901234123461', 'Demo Rice 5kg',  2, 8500.00, 17000.00, 'ba111111-1111-4111-8111-111111111106'::uuid, 6000.00),
    ('d6010005-0001-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'd6010004-0001-4000-8000-000000000001'::uuid, '44444444-4444-4444-8444-444444444410'::uuid, '5901234123466', 'Demo Milk 1L',   1,  900.00,   900.00, 'ba111111-1111-4111-8111-111111111101'::uuid, 600.00),
    ('d6010005-0001-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'd6010004-0001-4000-8000-000000000002'::uuid, '44444444-4444-4444-8444-444444444404'::uuid, '5901234123460', 'Demo Cooking Oil 1L', 2, 3000.00,  6000.00, 'ba111111-1111-4111-8111-111111111107'::uuid, 2400.00),
    ('d6010005-0001-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'd6010004-0001-4000-8000-000000000002'::uuid, '44444444-4444-4444-8444-444444444412'::uuid, '5901234123468', 'Demo Soft Drink 500ml', 12, 600.00, 7200.00, 'ba111111-1111-4111-8111-111111111110'::uuid, 400.00),
    ('d6010005-0001-4000-8000-000000000005'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'd6010004-0001-4000-8000-000000000002'::uuid, '44444444-4444-4444-8444-444444444409'::uuid, '5901234123465', 'Demo Bread Loaf', 1, 700.00, 700.00, 'ba111111-1111-4111-8111-111111111103'::uuid, 400.00),
    ('d6010005-0001-4000-8000-000000000006'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'd6010004-0001-4000-8000-000000000003'::uuid, '44444444-4444-4444-8444-444444444405'::uuid, '5901234123461', 'Demo Rice 5kg',  1, 8500.00,  8500.00, 'ba111111-1111-4111-8111-111111111106'::uuid, 6000.00),
    ('d6010005-0001-4000-8000-000000000007'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'd6010004-0001-4000-8000-000000000003'::uuid, '44444444-4444-4444-8444-444444444411'::uuid, '5901234123467', 'Demo Eggs Tray (30)', 2, 5500.00, 11000.00, 'ba111111-1111-4111-8111-111111111104'::uuid, 3500.00),
    ('d6010005-0001-4000-8000-000000000008'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'd6010004-0001-4000-8000-000000000003'::uuid, '44444444-4444-4444-8444-444444444406'::uuid, '5901234123462', 'Demo Sugar 1kg',  2, 1500.00,  3000.00, 'ba111111-1111-4111-8111-111111111105'::uuid, 1100.00),
    ('d6010005-0001-4000-8000-000000000009'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'd6010004-0001-4000-8000-000000000004'::uuid, '44444444-4444-4444-8444-444444444405'::uuid, '5901234123461', 'Demo Rice 5kg',  5, 8500.00, 42500.00, 'ba111111-1111-4111-8111-111111111106'::uuid, 6000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pos_payment_tenders (id, tenant_id, sales_order_id, tender_type, amount, reference, payer_phone, reconciliation_status, reconciliation_source, created_at)
VALUES
    ('d6010006-0001-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'd6010004-0001-4000-8000-000000000001'::uuid, 'MOMO', 18700.00, 'MTN-MOMO-REF-D60-01', '+250788123201', 'MATCHED', 'MTN',  NOW() - INTERVAL '2 days 3 hours'),
    ('d6010006-0001-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'd6010004-0001-4000-8000-000000000002'::uuid, 'CASH', 14200.00, NULL, NULL, 'NA', NULL, NOW() - INTERVAL '1 day 4 hours'),
    ('d6010006-0001-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'd6010004-0001-4000-8000-000000000003'::uuid, 'CARD', 22100.00, 'CARD-AUTH-D60-01', NULL, 'NA', NULL, NOW() - INTERVAL '4 hours'),
    ('d6010006-0001-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'd6010004-0001-4000-8000-000000000004'::uuid, 'ON_ACCOUNT', 42500.00, NULL, NULL, 'NA', NULL, NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Additional supplier bills (AP) for CFO aging demos
-- ---------------------------------------------------------------------
INSERT INTO supplier_bills (id, tenant_id, supplier_id, supplier_name, amount, currency_code, due_date, status, created_at)
VALUES
    ('d6010007-0001-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'b1111111-1111-4111-8111-111111111101'::uuid, 'Kigali Wholesale Foods',  245000.00, 'FRW', (CURRENT_DATE + 12)::date, 'OPEN',   NOW() - INTERVAL '6 days'),
    ('d6010007-0001-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'b1111111-1111-4111-8111-111111111102'::uuid, 'Akagera Beverages',       178000.00, 'FRW', (CURRENT_DATE + 8)::date,  'OPEN',   NOW() - INTERVAL '4 days'),
    ('d6010007-0001-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
     'b1111111-1111-4111-8111-111111111104'::uuid, 'East-African Dairy Co',   132000.00, 'FRW', (CURRENT_DATE - 3)::date,  'OPEN',   NOW() - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. CEO snapshot: remove today's row so CEO KPIs use live paid-invoice
--    math (revenue_growth / cash_runway / gross_margin). Re-inserting a
--    snapshot row would switch the API to legacy event-count KPIs.
--    CeoSnapshotProjector does not overwrite when event_log is empty.
-- ---------------------------------------------------------------------
DELETE FROM ceo_kpi_snapshot
WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  AND snapshot_date = CURRENT_DATE;

-- ---------------------------------------------------------------------
-- 6. Refresh other CQRS snapshot payloads (jsonb) for demo dashboards
-- ---------------------------------------------------------------------
INSERT INTO cfo_financial_snapshot (tenant_id, snapshot_date, payload)
VALUES (
    '11111111-1111-4111-8111-111111111111'::uuid,
    CURRENT_DATE,
    jsonb_build_object(
        'cashOnHandFRW',         4250000,
        'arOverdueFRW',           530000,
        'apOverdueFRW',           298000,
        'quickRatio',             1.42,
        'currentRatio',           1.87,
        'closeTasksOutstanding',  6
    )
)
ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET payload = EXCLUDED.payload;

INSERT INTO cfo_kpi_snapshot (tenant_id, snapshot_date, payload)
VALUES (
    '11111111-1111-4111-8111-111111111111'::uuid,
    CURRENT_DATE,
    jsonb_build_object(
        'workingCapitalFRW',      3200000,
        'daysSalesOutstanding',   28,
        'daysPayableOutstanding', 35,
        'cashPositionFRW',        4250000,
        'totalArFRW',             3200000,
        'totalApFRW',             2100000,
        'quickRatio',             1.42
    )
)
ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET payload = EXCLUDED.payload;

INSERT INTO sales_kpi_snapshot (tenant_id, snapshot_date, payload)
VALUES (
    '11111111-1111-4111-8111-111111111111'::uuid,
    CURRENT_DATE,
    jsonb_build_object(
        'dailyRevenueFRW',        22500,
        'avgBasketFRW',           5400,
        'topProduct',             'Demo Rice 5kg',
        'pipelineOpenFRW',        8500000,
        'pipelineValueFRW',       8500000,
        'winRatePct',             0.62,
        'revenueVsTargetPct',     0.91
    )
)
ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET payload = EXCLUDED.payload;

INSERT INTO ops_kpi_snapshot (tenant_id, snapshot_date, payload)
VALUES (
    '11111111-1111-4111-8111-111111111111'::uuid,
    CURRENT_DATE,
    jsonb_build_object(
        'lowStockSkus',      3,
        'expiryRiskLots',    2,
        'todaysOrders',      10,
        'fulfillmentRate',   0.99
    )
)
ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET payload = EXCLUDED.payload;
