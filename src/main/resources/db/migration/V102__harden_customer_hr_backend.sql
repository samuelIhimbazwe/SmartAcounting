-- Production hardening for customer CRM, credit ledger, layaway, HR, and shifts

-- Idempotent on-account charge rows (one CHARGE per POS sale per customer)
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_ledger_charge_per_sale
    ON customer_credit_ledger (tenant_id, customer_id, sales_order_id, entry_type)
    WHERE sales_order_id IS NOT NULL AND entry_type = 'CHARGE';

CREATE INDEX IF NOT EXISTS idx_layaway_orders_customer_status
    ON layaway_orders (tenant_id, customer_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_assignment_employee_shift_date
    ON shift_assignments (tenant_id, employee_id, shift_id, assigned_date);

ALTER TABLE hr_leave_requests
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID;

ALTER TABLE hr_employee_profiles
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_customers_tenant_phone_active
    ON finance_customers (tenant_id, phone)
    WHERE deleted_at IS NULL AND phone IS NOT NULL AND btrim(phone) <> '';

CREATE INDEX IF NOT EXISTS idx_hr_employee_profiles_tenant_name
    ON hr_employee_profiles (tenant_id, lower(full_name));

CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_employee
    ON hr_leave_requests (tenant_id, employee_id, created_at DESC);
