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
@Table(name = "accruals")
public class Accrual {
    @Id private UUID id;
    private UUID tenantId;
    private String accrualType;
    private String description;
    private BigDecimal amount;
    @Column(name = "currency_code", nullable = false, columnDefinition = "bpchar(3)")
    private String currencyCode;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer monthsTotal;
    private BigDecimal monthlyAmount;
    private String debitAccount;
    private String creditAccount;
    private Boolean autoReverse;
    private String status;
    private String lastPostedPeriod;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getAccrualType() { return accrualType; }
    public void setAccrualType(String accrualType) { this.accrualType = accrualType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public Integer getMonthsTotal() { return monthsTotal; }
    public void setMonthsTotal(Integer monthsTotal) { this.monthsTotal = monthsTotal; }
    public BigDecimal getMonthlyAmount() { return monthlyAmount; }
    public void setMonthlyAmount(BigDecimal monthlyAmount) { this.monthlyAmount = monthlyAmount; }
    public String getDebitAccount() { return debitAccount; }
    public void setDebitAccount(String debitAccount) { this.debitAccount = debitAccount; }
    public String getCreditAccount() { return creditAccount; }
    public void setCreditAccount(String creditAccount) { this.creditAccount = creditAccount; }
    public Boolean getAutoReverse() { return autoReverse; }
    public void setAutoReverse(Boolean autoReverse) { this.autoReverse = autoReverse; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLastPostedPeriod() { return lastPostedPeriod; }
    public void setLastPostedPeriod(String lastPostedPeriod) { this.lastPostedPeriod = lastPostedPeriod; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
