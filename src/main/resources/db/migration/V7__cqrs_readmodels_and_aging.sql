CREATE TABLE IF NOT EXISTS cfo_kpi_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS sales_kpi_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS ops_kpi_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    payload JSONB NOT NULL,
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS ar_ap_aging_snapshot (
    tenant_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    receivable_current NUMERIC(20,4) NOT NULL DEFAULT 0,
    receivable_30 NUMERIC(20,4) NOT NULL DEFAULT 0,
    receivable_60 NUMERIC(20,4) NOT NULL DEFAULT 0,
    receivable_90_plus NUMERIC(20,4) NOT NULL DEFAULT 0,
    payable_current NUMERIC(20,4) NOT NULL DEFAULT 0,
    payable_30 NUMERIC(20,4) NOT NULL DEFAULT 0,
    payable_60 NUMERIC(20,4) NOT NULL DEFAULT 0,
    payable_90_plus NUMERIC(20,4) NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, snapshot_date)
);

ALTER TABLE cfo_kpi_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfo_kpi_snapshot FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfo_kpi_snapshot_tenant_policy ON cfo_kpi_snapshot;
CREATE POLICY cfo_kpi_snapshot_tenant_policy ON cfo_kpi_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE sales_kpi_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_kpi_snapshot FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_kpi_snapshot_tenant_policy ON sales_kpi_snapshot;
CREATE POLICY sales_kpi_snapshot_tenant_policy ON sales_kpi_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE ops_kpi_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_kpi_snapshot FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_kpi_snapshot_tenant_policy ON ops_kpi_snapshot;
CREATE POLICY ops_kpi_snapshot_tenant_policy ON ops_kpi_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE ar_ap_aging_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_ap_aging_snapshot FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_ap_aging_snapshot_tenant_policy ON ar_ap_aging_snapshot;
CREATE POLICY ar_ap_aging_snapshot_tenant_policy ON ar_ap_aging_snapshot
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
