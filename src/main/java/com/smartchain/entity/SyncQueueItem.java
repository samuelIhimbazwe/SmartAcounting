package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sync_queue")
public class SyncQueueItem {
    @Id
    private UUID id;
    private UUID tenantId;
    private UUID deviceId;
    private String operationType;
    private String entityType;
    private String payload;
    private long lamportClock;
    private String status;
    private String conflictPolicy;
    private Instant syncedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getDeviceId() { return deviceId; }
    public void setDeviceId(UUID deviceId) { this.deviceId = deviceId; }
    public String getOperationType() { return operationType; }
    public void setOperationType(String operationType) { this.operationType = operationType; }
    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    public long getLamportClock() { return lamportClock; }
    public void setLamportClock(long lamportClock) { this.lamportClock = lamportClock; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getConflictPolicy() { return conflictPolicy; }
    public void setConflictPolicy(String conflictPolicy) { this.conflictPolicy = conflictPolicy; }
    public Instant getSyncedAt() { return syncedAt; }
    public void setSyncedAt(Instant syncedAt) { this.syncedAt = syncedAt; }
}
