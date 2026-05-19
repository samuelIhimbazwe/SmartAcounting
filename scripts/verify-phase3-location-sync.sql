-- Run after Flyway V71 + seed-staging-two-locations.sql
-- psql "$DATABASE_URL" -f scripts/verify-phase3-location-sync.sql
-- Exit code 0 = pass; non-zero = fail (psql -v ON_ERROR_STOP=1)

\set ON_ERROR_STOP on

SELECT location_code, product_id::text, quantity
FROM inventory_balances
WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  AND product_id = '22222222-2222-4222-8222-222222222201'::uuid
  AND location_code IN ('SHOP', 'BRANCH_B')
ORDER BY location_code;

DO $$
DECLARE
  shop_qty numeric;
  branch_qty numeric;
BEGIN
  SELECT quantity INTO shop_qty
  FROM inventory_balances
  WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
    AND product_id = '22222222-2222-4222-8222-222222222201'::uuid
    AND location_code = 'SHOP';

  SELECT quantity INTO branch_qty
  FROM inventory_balances
  WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
    AND product_id = '22222222-2222-4222-8222-222222222201'::uuid
    AND location_code = 'BRANCH_B';

  IF shop_qty IS NULL OR branch_qty IS NULL THEN
    RAISE EXCEPTION 'FAIL: demo water missing at SHOP or BRANCH_B (apply seed script)';
  END IF;
  IF shop_qty = branch_qty THEN
    RAISE EXCEPTION 'FAIL: SHOP (%) and BRANCH_B (%) counts match — location scoping broken', shop_qty, branch_qty;
  END IF;
  RAISE NOTICE 'PASS: SHOP=% BRANCH_B=% (counts differ)', shop_qty, branch_qty;
END $$;
