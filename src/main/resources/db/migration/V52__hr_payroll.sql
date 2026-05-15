ALTER TABLE hr_employee_profiles
    ADD COLUMN IF NOT EXISTS base_salary NUMERIC(19,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deduct_absences BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL,
    shift_id UUID NOT NULL REFERENCES shifts(id),
    assigned_date DATE NOT NULL,
    till_code VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    scheduled_start TIME,
    scheduled_end TIME,
    minutes_late INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PRESENT',
    notes TEXT,
    recorded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance_employee_date UNIQUE (tenant_id, employee_id, attendance_date)
);

CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    period VARCHAR(7) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    total_gross NUMERIC(19,4) DEFAULT 0,
    total_rssb_employee NUMERIC(19,4) DEFAULT 0,
    total_rssb_employer NUMERIC(19,4) DEFAULT 0,
    total_paye NUMERIC(19,4) DEFAULT 0,
    total_cbhi NUMERIC(19,4) DEFAULT 0,
    total_maternity NUMERIC(19,4) DEFAULT 0,
    total_net NUMERIC(19,4) DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    prepared_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    posted_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    journal_entry_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payroll_run_period UNIQUE (tenant_id, period)
);

CREATE TABLE payroll_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id),
    employee_id UUID NOT NULL,
    employee_name VARCHAR(300) NOT NULL,
    department VARCHAR(100),
    gross_salary NUMERIC(19,4) NOT NULL,
    rssb_employee NUMERIC(19,4) NOT NULL,
    rssb_employer NUMERIC(19,4) NOT NULL,
    maternity_insurance NUMERIC(19,4) NOT NULL,
    cbhi NUMERIC(19,4) NOT NULL,
    taxable_income NUMERIC(19,4) NOT NULL,
    paye NUMERIC(19,4) NOT NULL,
    other_deductions NUMERIC(19,4) DEFAULT 0,
    other_additions NUMERIC(19,4) DEFAULT 0,
    net_pay NUMERIC(19,4) NOT NULL,
    working_days INTEGER,
    absent_days INTEGER DEFAULT 0,
    overtime_hours NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_tenant_date ON attendance_records(tenant_id, attendance_date);
CREATE INDEX idx_payroll_runs_tenant ON payroll_runs(tenant_id, period);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shifts_tenant_policy ON shifts;
CREATE POLICY shifts_tenant_policy ON shifts
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shift_assignments_tenant_policy ON shift_assignments;
CREATE POLICY shift_assignments_tenant_policy ON shift_assignments
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_records_tenant_policy ON attendance_records;
CREATE POLICY attendance_records_tenant_policy ON attendance_records
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_runs_tenant_policy ON payroll_runs;
CREATE POLICY payroll_runs_tenant_policy ON payroll_runs
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_lines_tenant_policy ON payroll_lines;
CREATE POLICY payroll_lines_tenant_policy ON payroll_lines
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
