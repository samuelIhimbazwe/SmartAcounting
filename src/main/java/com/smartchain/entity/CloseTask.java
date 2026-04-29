package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "close_tasks")
public class CloseTask {
    @Id private UUID id;
    private UUID tenantId;
    private String period;
    private String taskKey;
    private String ownerRole;
    private String status;
    private String dependsOnJson;
    private BigDecimal riskScore;
    private Instant createdAt;
    private Instant completedAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getPeriod() { return period; } public void setPeriod(String period) { this.period = period; }
    public String getTaskKey() { return taskKey; } public void setTaskKey(String taskKey) { this.taskKey = taskKey; }
    public String getOwnerRole() { return ownerRole; } public void setOwnerRole(String ownerRole) { this.ownerRole = ownerRole; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public String getDependsOnJson() { return dependsOnJson; } public void setDependsOnJson(String dependsOnJson) { this.dependsOnJson = dependsOnJson; }
    public BigDecimal getRiskScore() { return riskScore; } public void setRiskScore(BigDecimal riskScore) { this.riskScore = riskScore; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getCompletedAt() { return completedAt; } public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
