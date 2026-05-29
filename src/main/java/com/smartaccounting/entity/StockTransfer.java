package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_transfers")
public class StockTransfer {
    @Id private UUID id;
    private UUID tenantId;
    private UUID fromLocationId;
    private UUID toLocationId;
    private String status;
    private UUID createdBy;
    private Instant createdAt;
    private Instant receivedAt;
    private String notes;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getFromLocationId() { return fromLocationId; }
    public void setFromLocationId(UUID fromLocationId) { this.fromLocationId = fromLocationId; }
    public UUID getToLocationId() { return toLocationId; }
    public void setToLocationId(UUID toLocationId) { this.toLocationId = toLocationId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
