package com.smartaccounting.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenant_setup")
public class TenantSetup {
    @Id
    private UUID id;
    @Column(name = "tenant_id")
    private UUID tenantId;
    @Enumerated(EnumType.STRING)
    @Column(name = "business_size")
    private BusinessSize businessSize;
    @Enumerated(EnumType.STRING)
    @Column(name = "business_type")
    private BusinessType businessType;
    @Column(name = "selected_roles", columnDefinition = "jsonb")
    private String selectedRoles;
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public BusinessSize getBusinessSize() { return businessSize; }
    public void setBusinessSize(BusinessSize businessSize) { this.businessSize = businessSize; }
    public BusinessType getBusinessType() { return businessType; }
    public void setBusinessType(BusinessType businessType) { this.businessType = businessType; }
    public String getSelectedRoles() { return selectedRoles; }
    public void setSelectedRoles(String selectedRoles) { this.selectedRoles = selectedRoles; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
