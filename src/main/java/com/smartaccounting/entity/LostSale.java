package com.smartaccounting.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lost_sales")
public class LostSale {
    @Id private UUID id;
    private UUID tenantId;
    private UUID productId;
    private String sku;
    private String productName;
    private Instant attemptedAt;
    private BigDecimal attemptedQuantity;
    private BigDecimal unitPrice;
    private BigDecimal estimatedLostRevenue;
    @Column(name = "currency_code", nullable = false, columnDefinition = "bpchar(3)")
    private String currencyCode;
    private String cashierId;
    private String tillCode;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public Instant getAttemptedAt() { return attemptedAt; }
    public void setAttemptedAt(Instant attemptedAt) { this.attemptedAt = attemptedAt; }
    public BigDecimal getAttemptedQuantity() { return attemptedQuantity; }
    public void setAttemptedQuantity(BigDecimal attemptedQuantity) { this.attemptedQuantity = attemptedQuantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public BigDecimal getEstimatedLostRevenue() { return estimatedLostRevenue; }
    public void setEstimatedLostRevenue(BigDecimal estimatedLostRevenue) { this.estimatedLostRevenue = estimatedLostRevenue; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public String getCashierId() { return cashierId; }
    public void setCashierId(String cashierId) { this.cashierId = cashierId; }
    public String getTillCode() { return tillCode; }
    public void setTillCode(String tillCode) { this.tillCode = tillCode; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
