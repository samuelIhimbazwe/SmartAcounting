-- B1: GRN allow-expired flag; B2: customer phone for SMS reminders

ALTER TABLE goods_received_notes
    ADD COLUMN IF NOT EXISTS allow_expired_receipt BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE finance_customers
    ADD COLUMN IF NOT EXISTS phone VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_finance_customers_tenant_phone
    ON finance_customers (tenant_id, phone)
    WHERE phone IS NOT NULL AND phone <> '';

-- Demo tenant: sample phones for AR reminder testing
UPDATE finance_customers
SET phone = '+250788111101'
WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  AND lower(customer_name) = lower('Kigali Corner Shop')
  AND (phone IS NULL OR phone = '');

UPDATE finance_customers
SET phone = '+250788111104'
WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  AND lower(customer_name) = lower('Gisenyi Hotel Group')
  AND (phone IS NULL OR phone = '');

UPDATE finance_customers
SET phone = '+250788111106'
WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  AND lower(customer_name) = lower('Musanze Bistro')
  AND (phone IS NULL OR phone = '');
