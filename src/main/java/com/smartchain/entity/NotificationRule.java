package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_rules")
public class NotificationRule {
    @Id private UUID id;
    private UUID tenantId;
    private String eventType;
    private String channelsJson;
    private String targetRole;
    private boolean active;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getEventType() { return eventType; } public void setEventType(String eventType) { this.eventType = eventType; }
    public String getChannelsJson() { return channelsJson; } public void setChannelsJson(String channelsJson) { this.channelsJson = channelsJson; }
    public String getTargetRole() { return targetRole; } public void setTargetRole(String targetRole) { this.targetRole = targetRole; }
    public boolean isActive() { return active; } public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
