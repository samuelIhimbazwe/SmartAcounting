package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_events")
public class NotificationEvent {
    @Id private UUID id;
    private UUID tenantId;
    private String eventType;
    private String payload;
    private String status;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getEventType() { return eventType; } public void setEventType(String eventType) { this.eventType = eventType; }
    public String getPayload() { return payload; } public void setPayload(String payload) { this.payload = payload; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
