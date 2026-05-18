package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "customer_segments")
public class CustomerSegment {
    @Id private UUID id;
    private UUID tenantId;
    private UUID customerId;
    private String customerName;
    private String phone;
    private String email;
    private String segment;
    private BigDecimal totalSpend;
    private Integer transactionCount;
    private BigDecimal avgOrderValue;
    private LocalDate lastPurchaseDate;
    private Integer daysSincePurchase;
    private Integer rfmRecencyScore;
    private Integer rfmFrequencyScore;
    private Integer rfmMonetaryScore;
    private Integer rfmTotalScore;
    private String currencyCode;
    private Instant lastSegmentedAt;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSegment() { return segment; }
    public void setSegment(String segment) { this.segment = segment; }
    public BigDecimal getTotalSpend() { return totalSpend; }
    public void setTotalSpend(BigDecimal totalSpend) { this.totalSpend = totalSpend; }
    public Integer getTransactionCount() { return transactionCount; }
    public void setTransactionCount(Integer transactionCount) { this.transactionCount = transactionCount; }
    public BigDecimal getAvgOrderValue() { return avgOrderValue; }
    public void setAvgOrderValue(BigDecimal avgOrderValue) { this.avgOrderValue = avgOrderValue; }
    public LocalDate getLastPurchaseDate() { return lastPurchaseDate; }
    public void setLastPurchaseDate(LocalDate lastPurchaseDate) { this.lastPurchaseDate = lastPurchaseDate; }
    public Integer getDaysSincePurchase() { return daysSincePurchase; }
    public void setDaysSincePurchase(Integer daysSincePurchase) { this.daysSincePurchase = daysSincePurchase; }
    public Integer getRfmRecencyScore() { return rfmRecencyScore; }
    public void setRfmRecencyScore(Integer rfmRecencyScore) { this.rfmRecencyScore = rfmRecencyScore; }
    public Integer getRfmFrequencyScore() { return rfmFrequencyScore; }
    public void setRfmFrequencyScore(Integer rfmFrequencyScore) { this.rfmFrequencyScore = rfmFrequencyScore; }
    public Integer getRfmMonetaryScore() { return rfmMonetaryScore; }
    public void setRfmMonetaryScore(Integer rfmMonetaryScore) { this.rfmMonetaryScore = rfmMonetaryScore; }
    public Integer getRfmTotalScore() { return rfmTotalScore; }
    public void setRfmTotalScore(Integer rfmTotalScore) { this.rfmTotalScore = rfmTotalScore; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public Instant getLastSegmentedAt() { return lastSegmentedAt; }
    public void setLastSegmentedAt(Instant lastSegmentedAt) { this.lastSegmentedAt = lastSegmentedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
