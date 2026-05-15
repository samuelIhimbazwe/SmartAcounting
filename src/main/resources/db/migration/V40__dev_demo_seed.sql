-- Dev/demo seed: single tenant with retail-style products, POS catalog barcodes, and shop inventory.
-- Intended for local UX testing. Login continues to use in-memory users (see README / AuthUsersConfig).
-- Set VITE_DEFAULT_TENANT_ID on the frontend to this tenant UUID so JWT tenant context matches these rows.

INSERT INTO tenants (id, name, status, created_at, plan, phone_verified)
VALUES (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Demo Retail Co',
    'ACTIVE',
    NOW(),
    'STANDARD',
    FALSE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, tenant_id, name, sku, unit, created_at)
VALUES
    (
        '22222222-2222-4222-8222-222222222201'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid,
        'Demo Water 500ml',
        'DEMO-WATER',
        'EA',
        NOW()
    ),
    (
        '22222222-2222-4222-8222-222222222202'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid,
        'Demo Maize Flour 2kg',
        'DEMO-FLOUR',
        'EA',
        NOW()
    ),
    (
        '22222222-2222-4222-8222-222222222203'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid,
        'Demo Mobile Airtime Card',
        'DEMO-AIR',
        'EA',
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_balances (id, tenant_id, product_id, location_code, quantity, version, created_at, updated_at)
VALUES
    (
        '33333333-3333-4333-8333-333333333301'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '22222222-2222-4222-8222-222222222201'::uuid,
        'SHOP',
        120.0000,
        0,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333302'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '22222222-2222-4222-8222-222222222202'::uuid,
        'SHOP',
        8.0000,
        0,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333303'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '22222222-2222-4222-8222-222222222203'::uuid,
        'SHOP',
        500.0000,
        0,
        NOW(),
        NOW()
    )
ON CONFLICT (tenant_id, product_id, location_code) DO NOTHING;

INSERT INTO pos_catalog_items (
    id,
    tenant_id,
    barcode,
    sku,
    display_name,
    unit_price,
    currency_code,
    active,
    created_at,
    product_id,
    reorder_point
)
VALUES
    (
        '44444444-4444-4444-8444-444444444401'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '5901234123457',
        'DEMO-WATER',
        'Demo Water 500ml',
        500.00,
        'FRW',
        TRUE,
        NOW(),
        '22222222-2222-4222-8222-222222222201'::uuid,
        20.0000
    ),
    (
        '44444444-4444-4444-8444-444444444402'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '5901234123458',
        'DEMO-FLOUR',
        'Demo Maize Flour 2kg',
        3500.00,
        'FRW',
        TRUE,
        NOW(),
        '22222222-2222-4222-8222-222222222202'::uuid,
        15.0000
    ),
    (
        '44444444-4444-4444-8444-444444444403'::uuid,
        '11111111-1111-4111-8111-111111111111'::uuid,
        '5901234123459',
        'DEMO-AIR',
        'Demo Mobile Airtime Card',
        1000.00,
        'FRW',
        TRUE,
        NOW(),
        '22222222-2222-4222-8222-222222222203'::uuid,
        NULL
    )
ON CONFLICT (tenant_id, barcode) DO NOTHING;
