-- Phase 3: locations, registers, per-location stock, transfers

CREATE TABLE locations (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    name            VARCHAR(255) NOT NULL,
    address         TEXT,
    location_code   VARCHAR(64) NOT NULL,
    currency_default VARCHAR(3) NOT NULL DEFAULT 'FRW',
    tax_config_id   UUID,
    timezone        VARCHAR(64) NOT NULL DEFAULT 'Africa/Kigali',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_locations_tenant_code UNIQUE (tenant_id, location_code)
);

CREATE INDEX idx_locations_tenant ON locations (tenant_id);

CREATE TABLE registers (
    id           UUID PRIMARY KEY,
    tenant_id    UUID NOT NULL,
    location_id  UUID NOT NULL REFERENCES locations (id),
    name         VARCHAR(128) NOT NULL,
    hardware_id  VARCHAR(255),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_registers_location_name UNIQUE (tenant_id, location_id, name)
);

CREATE INDEX idx_registers_location ON registers (tenant_id, location_id);

CREATE TABLE user_location_access (
    tenant_id   UUID NOT NULL,
    user_id     UUID NOT NULL,
    location_id UUID NOT NULL REFERENCES locations (id),
    PRIMARY KEY (tenant_id, user_id, location_id)
);

CREATE TABLE stock_levels (
    id            UUID PRIMARY KEY,
    tenant_id     UUID NOT NULL,
    location_id   UUID NOT NULL REFERENCES locations (id),
    product_id    UUID NOT NULL,
    variant_id    UUID,
    qty           NUMERIC(19, 4) NOT NULL DEFAULT 0,
    reorder_point NUMERIC(19, 4) NOT NULL DEFAULT 0,
    reorder_qty   NUMERIC(19, 4) NOT NULL DEFAULT 0,
    CONSTRAINT uq_stock_levels UNIQUE (tenant_id, location_id, product_id, variant_id)
);

CREATE INDEX idx_stock_levels_location ON stock_levels (tenant_id, location_id);

CREATE TABLE stock_transfers (
    id               UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL,
    from_location_id UUID NOT NULL REFERENCES locations (id),
    to_location_id   UUID NOT NULL REFERENCES locations (id),
    status           VARCHAR(32) NOT NULL,
    created_by       UUID NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_at      TIMESTAMPTZ
);

CREATE TABLE stock_transfer_lines (
    id          UUID PRIMARY KEY,
    transfer_id UUID NOT NULL REFERENCES stock_transfers (id) ON DELETE CASCADE,
    product_id  UUID NOT NULL,
    variant_id  UUID,
    qty         NUMERIC(19, 4) NOT NULL
);

ALTER TABLE till_sessions
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations (id),
    ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES registers (id);

ALTER TABLE price_lists
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations (id),
    ADD COLUMN IF NOT EXISTS scope VARCHAR(16) NOT NULL DEFAULT 'GLOBAL';

ALTER TABLE finance_customers
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations (id);

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations (id);

CREATE INDEX idx_till_sessions_location_open
    ON till_sessions (tenant_id, location_id, status)
    WHERE status = 'OPEN';
