package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reconciliations")
public class Reconciliation {
    @Id private UUID id;
    private UUID tenantId;
    private String accountCode;
    private String period;
    private String status;
    private BigDecimal varianceAmount;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getAccountCode() { return accountCode; } public void setAccountCode(String accountCode) { this.accountCode = accountCode; }
    public String getPeriod() { return period; } public void setPeriod(String period) { this.period = period; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public BigDecimal getVarianceAmount() { return varianceAmount; } public void setVarianceAmount(BigDecimal varianceAmount) { this.varianceAmount = varianceAmount; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
