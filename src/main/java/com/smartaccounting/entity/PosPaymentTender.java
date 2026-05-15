package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pos_payment_tenders")
public class PosPaymentTender {
    @Id private UUID id;
    private UUID tenantId;
    private UUID salesOrderId;
    private String tenderType;
    private BigDecimal amount;
    private String reference;
    /** NA | PENDING | MATCHED | MISMATCH */
    private String reconciliationStatus;
    private Instant reconciledAt;
    /** e.g. WEBHOOK_MTN */
    private String reconciliationSource;
    private String payerPhone;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getSalesOrderId() { return salesOrderId; }
    public void setSalesOrderId(UUID salesOrderId) { this.salesOrderId = salesOrderId; }
    public String getTenderType() { return tenderType; }
    public void setTenderType(String tenderType) { this.tenderType = tenderType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getReconciliationStatus() { return reconciliationStatus; }
    public void setReconciliationStatus(String reconciliationStatus) { this.reconciliationStatus = reconciliationStatus; }
    public Instant getReconciledAt() { return reconciledAt; }
    public void setReconciledAt(Instant reconciledAt) { this.reconciledAt = reconciledAt; }
    public String getReconciliationSource() { return reconciliationSource; }
    public void setReconciliationSource(String reconciliationSource) { this.reconciliationSource = reconciliationSource; }
    public String getPayerPhone() { return payerPhone; }
    public void setPayerPhone(String payerPhone) { this.payerPhone = payerPhone; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
