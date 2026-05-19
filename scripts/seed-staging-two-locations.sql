-- Staging / demo: Branch B with different inventory than SHOP (V40/V41 demo tenant).
-- Run after Flyway V71. Safe to re-run (upserts).
--
-- psql: psql "$DATABASE_URL" -f scripts/seed-staging-two-locations.sql

-- Demo tenant + ops user (V41)
-- Tenant: 11111111-1111-4111-8111-111111111111
-- Ops:     33333333-3333-4333-8333-333333333304  (username: ops)

INSERT INTO locations (id, tenant_id, name, address, location_code, currency_default, timezone, is_active, created_at)
VALUES
  ('b1111111-1111-4111-8111-111111111101'::uuid,
   '11111111-1111-4111-8111-111111111111'::uuid,
   'Main Shop', 'Kigali HQ', 'SHOP', 'FRW', 'Africa/Kigali', TRUE, NOW()),
  ('b1111111-1111-4111-8111-111111111102'::uuid,
   '11111111-1111-4111-8111-111111111111'::uuid,
   'Branch B', 'Kigali Branch B', 'BRANCH_B', 'FRW', 'Africa/Kigali', TRUE, NOW())
ON CONFLICT (tenant_id, location_code) DO UPDATE
  SET name = EXCLUDED.name, is_active = TRUE;

INSERT INTO registers (id, tenant_id, location_id, name, is_active, created_at)
VALUES
  ('c1111111-1111-4111-8111-111111111101'::uuid,
   '11111111-1111-4111-8111-111111111111'::uuid,
   'b1111111-1111-4111-8111-111111111101'::uuid, 'REG-SHOP-01', TRUE, NOW()),
  ('c1111111-1111-4111-8111-111111111102'::uuid,
   '11111111-1111-4111-8111-111111111111'::uuid,
   'b1111111-1111-4111-8111-111111111102'::uuid, 'REG-B-01', TRUE, NOW())
ON CONFLICT (tenant_id, location_id, name) DO NOTHING;

INSERT INTO user_location_access (tenant_id, user_id, location_id)
VALUES
  ('11111111-1111-4111-8111-111111111111'::uuid,
   '33333333-3333-4333-8333-333333333304'::uuid,
   'b1111111-1111-4111-8111-111111111101'::uuid),
  ('11111111-1111-4111-8111-111111111111'::uuid,
   '33333333-3333-4333-8333-333333333304'::uuid,
   'b1111111-1111-4111-8111-111111111102'::uuid),
  ('11111111-1111-4111-8111-111111111111'::uuid,
   '33333333-3333-4333-8333-333333333301'::uuid,
   'b1111111-1111-4111-8111-111111111101'::uuid),
  ('11111111-1111-4111-8111-111111111111'::uuid,
   '33333333-3333-4333-8333-333333333301'::uuid,
   'b1111111-1111-4111-8111-111111111102'::uuid)
ON CONFLICT DO NOTHING;

-- V40 demo products only (skip if your staging DB uses V41 SKUs only)
INSERT INTO inventory_balances (id, tenant_id, product_id, location_code, quantity, version, created_at, updated_at)
VALUES
  ('d3333333-3333-4333-8333-333333333311'::uuid,
   '11111111-1111-4111-8111-111111111111'::uuid,
   '22222222-2222-4222-8222-222222222201'::uuid, 'BRANCH_B', 40, 0, NOW(), NOW()),
  ('d3333333-3333-4333-8333-333333333312'::uuid,
   '11111111-1111-4111-8111-111111111111'::uuid,
   '22222222-2222-4222-8222-222222222202'::uuid, 'BRANCH_B', 95, 0, NOW(), NOW()),
  ('d3333333-3333-4333-8333-333333333313'::uuid,
   '11111111-1111-4111-8111-111111111111'::uuid,
   '22222222-2222-4222-8222-222222222203'::uuid, 'BRANCH_B', 12, 0, NOW(), NOW())
ON CONFLICT (tenant_id, product_id, location_code) DO UPDATE
  SET quantity = EXCLUDED.quantity, updated_at = NOW();
