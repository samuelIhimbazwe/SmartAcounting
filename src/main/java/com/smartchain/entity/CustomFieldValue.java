package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "custom_field_values")
public class CustomFieldValue {
    @Id private UUID id;
    private UUID tenantId;
    private String entityType;
    private UUID entityId;
    private String fieldKey;
    private String fieldValue;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getEntityType() { return entityType; } public void setEntityType(String entityType) { this.entityType = entityType; }
    public UUID getEntityId() { return entityId; } public void setEntityId(UUID entityId) { this.entityId = entityId; }
    public String getFieldKey() { return fieldKey; } public void setFieldKey(String fieldKey) { this.fieldKey = fieldKey; }
    public String getFieldValue() { return fieldValue; } public void setFieldValue(String fieldValue) { this.fieldValue = fieldValue; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
