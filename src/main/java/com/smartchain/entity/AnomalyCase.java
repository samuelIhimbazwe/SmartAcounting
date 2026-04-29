package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "anomaly_cases")
public class AnomalyCase {
    @Id private UUID id;
    private UUID tenantId;
    private String affectedRole;
    private String severity;
    private String title;
    private String details;
    private String kpiName;
    private BigDecimal currentValue;
    private String expectedRange;
    private BigDecimal zScore;
    private String contributorsJson;
    private String status;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getAffectedRole() { return affectedRole; } public void setAffectedRole(String affectedRole) { this.affectedRole = affectedRole; }
    public String getSeverity() { return severity; } public void setSeverity(String severity) { this.severity = severity; }
    public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
    public String getDetails() { return details; } public void setDetails(String details) { this.details = details; }
    public String getKpiName() { return kpiName; } public void setKpiName(String kpiName) { this.kpiName = kpiName; }
    public BigDecimal getCurrentValue() { return currentValue; } public void setCurrentValue(BigDecimal currentValue) { this.currentValue = currentValue; }
    public String getExpectedRange() { return expectedRange; } public void setExpectedRange(String expectedRange) { this.expectedRange = expectedRange; }
    public BigDecimal getZScore() { return zScore; } public void setZScore(BigDecimal zScore) { this.zScore = zScore; }
    public String getContributorsJson() { return contributorsJson; } public void setContributorsJson(String contributorsJson) { this.contributorsJson = contributorsJson; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
