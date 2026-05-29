-- Richer action-hub demo cards (PO approval, reorder suggestion, POS void anomaly).

UPDATE action_queue
SET action_type = 'DRAFT_PURCHASE_ORDER',
    preview_title = 'PO #2026-045 — Inyange Industries',
    preview_summary = '100× Inyange Rice 5kg',
    requested_by = '33333333-3333-4333-8333-333333333304'::uuid,
    payload = '{
      "poNumber": "2026-045",
      "supplierName": "Inyange Industries",
      "productName": "Inyange Rice 5kg",
      "quantity": 100,
      "totalAmountRwf": 620000,
      "requestedByName": "Patrick"
    }'::jsonb,
    approval_expires_at = NOW() - INTERVAL '2 hours',
    created_at = NOW() - INTERVAL '2 hours'
WHERE id = 'acff1111-1111-4111-8111-111111111102'::uuid
  AND tenant_id = '11111111-1111-4111-8111-111111111111'::uuid;

INSERT INTO action_queue (
    id, tenant_id, action_type, action_ref, payload, status, created_at,
    approval_status, approval_expires_at, preview_title, preview_summary, permission_code
)
VALUES (
    'acff1111-1111-4111-8111-111111111108'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'REORDER_SUGGESTION',
    '22222222-2222-4222-8222-222222222204',
    '{
      "productName": "Maize Flour",
      "currentStock": 4,
      "reorderPoint": 20,
      "suggestedQuantity": 100,
      "supplierName": "Minimex"
    }'::jsonb,
    'PENDING_APPROVAL',
    NOW() - INTERVAL '3 hours',
    'PENDING',
    NOW() + INTERVAL '1 day',
    'AI suggests reorder: Maize Flour',
    'Current stock: 4 units (below 20) · Suggested: 100 units from Minimex',
    'PROCUREMENT_WRITE'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO anomaly_cases (
    id, tenant_id, affected_role, severity, title, details, status,
    kpi_name, current_value, expected_range, z_score, contributors_json, created_at
)
VALUES (
    'aa111111-1111-4111-8111-111111111108'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'OPS_MANAGER',
    'HIGH',
    'Unusual void rate on REG-01',
    '8 voids today vs average 1.2 per shift.',
    'OPEN',
    'pos_void_count',
    8.00,
    '0-2',
    3.4,
    '[{"register":"REG-01","cashier":"Marie Uwase","voidCountToday":8,"voidAvg":1.2}]'::jsonb,
    NOW() - INTERVAL '4 hours'
)
ON CONFLICT (id) DO NOTHING;
