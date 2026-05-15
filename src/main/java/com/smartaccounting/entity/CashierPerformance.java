package com.smartaccounting.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "cashier_performance")
public class CashierPerformance {
    @Id private UUID id;
    private UUID tenantId;
    private String cashierId;
    private String cashierName;
    private LocalDate shiftDate;
    private String tillCode;
    private Integer transactionCount;
    private BigDecimal totalSales;
    private Integer totalVoids;
    private Integer totalRefunds;
    private BigDecimal voidAmount;
    private BigDecimal refundAmount;
    private BigDecimal avgTransactionValue;
    private Integer avgTransactionSeconds;
    @Column(name = "currency_code", nullable = false, columnDefinition = "bpchar(3)")
    private String currencyCode;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getCashierId() { return cashierId; }
    public void setCashierId(String cashierId) { this.cashierId = cashierId; }
    public String getCashierName() { return cashierName; }
    public void setCashierName(String cashierName) { this.cashierName = cashierName; }
    public LocalDate getShiftDate() { return shiftDate; }
    public void setShiftDate(LocalDate shiftDate) { this.shiftDate = shiftDate; }
    public String getTillCode() { return tillCode; }
    public void setTillCode(String tillCode) { this.tillCode = tillCode; }
    public Integer getTransactionCount() { return transactionCount; }
    public void setTransactionCount(Integer transactionCount) { this.transactionCount = transactionCount; }
    public BigDecimal getTotalSales() { return totalSales; }
    public void setTotalSales(BigDecimal totalSales) { this.totalSales = totalSales; }
    public Integer getTotalVoids() { return totalVoids; }
    public void setTotalVoids(Integer totalVoids) { this.totalVoids = totalVoids; }
    public Integer getTotalRefunds() { return totalRefunds; }
    public void setTotalRefunds(Integer totalRefunds) { this.totalRefunds = totalRefunds; }
    public BigDecimal getVoidAmount() { return voidAmount; }
    public void setVoidAmount(BigDecimal voidAmount) { this.voidAmount = voidAmount; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public BigDecimal getAvgTransactionValue() { return avgTransactionValue; }
    public void setAvgTransactionValue(BigDecimal avgTransactionValue) { this.avgTransactionValue = avgTransactionValue; }
    public Integer getAvgTransactionSeconds() { return avgTransactionSeconds; }
    public void setAvgTransactionSeconds(Integer avgTransactionSeconds) { this.avgTransactionSeconds = avgTransactionSeconds; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
