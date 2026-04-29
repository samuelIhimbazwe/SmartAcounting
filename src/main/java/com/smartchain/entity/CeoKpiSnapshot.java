package com.smartchain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "ceo_kpi_snapshot")
@IdClass(CeoKpiSnapshot.Key.class)
public class CeoKpiSnapshot {
    @Id
    private UUID tenantId;
    @Id
    private LocalDate snapshotDate;

    @Column(columnDefinition = "jsonb")
    private String payload;

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public LocalDate getSnapshotDate() {
        return snapshotDate;
    }

    public void setSnapshotDate(LocalDate snapshotDate) {
        this.snapshotDate = snapshotDate;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public static class Key implements Serializable {
        private UUID tenantId;
        private LocalDate snapshotDate;

        public Key() {
        }

        public Key(UUID tenantId, LocalDate snapshotDate) {
            this.tenantId = tenantId;
            this.snapshotDate = snapshotDate;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Key key)) {
                return false;
            }
            return Objects.equals(tenantId, key.tenantId) && Objects.equals(snapshotDate, key.snapshotDate);
        }

        @Override
        public int hashCode() {
            return Objects.hash(tenantId, snapshotDate);
        }
    }
}
