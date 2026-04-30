package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_applications")
public class PaymentApplication {
    @Id private UUID id;
    private UUID tenantId;
    private UUID paymentId;
    private String targetType;
    private UUID targetId;
    private BigDecimal appliedAmount;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getPaymentId() { return paymentId; } public void setPaymentId(UUID paymentId) { this.paymentId = paymentId; }
    public String getTargetType() { return targetType; } public void setTargetType(String targetType) { this.targetType = targetType; }
    public UUID getTargetId() { return targetId; } public void setTargetId(UUID targetId) { this.targetId = targetId; }
    public BigDecimal getAppliedAmount() { return appliedAmount; } public void setAppliedAmount(BigDecimal appliedAmount) { this.appliedAmount = appliedAmount; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
