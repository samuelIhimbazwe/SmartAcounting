package com.smartaccounting.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "finance_customers")
public class FinanceCustomer {
    @Id private UUID id;
    private UUID tenantId;
    private String customerName;
    private String phone;
    private String email;
    private String tinNumber;
    private String customerType;
    private UUID priceListId;
    private BigDecimal creditLimit;
    private BigDecimal creditBalance;
    private Integer loyaltyPoints;
    private Boolean loyaltyEnabled;
    private String notes;
    private boolean taxExempt;
    private BigDecimal badDebtRiskScore;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant deletedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTinNumber() { return tinNumber; }
    public void setTinNumber(String tinNumber) { this.tinNumber = tinNumber; }
    public String getCustomerType() { return customerType; }
    public void setCustomerType(String customerType) { this.customerType = customerType; }
    public UUID getPriceListId() { return priceListId; }
    public void setPriceListId(UUID priceListId) { this.priceListId = priceListId; }
    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }
    public BigDecimal getCreditBalance() { return creditBalance; }
    public void setCreditBalance(BigDecimal creditBalance) { this.creditBalance = creditBalance; }
    public Integer getLoyaltyPoints() { return loyaltyPoints; }
    public void setLoyaltyPoints(Integer loyaltyPoints) { this.loyaltyPoints = loyaltyPoints; }
    public Boolean getLoyaltyEnabled() { return loyaltyEnabled; }
    public void setLoyaltyEnabled(Boolean loyaltyEnabled) { this.loyaltyEnabled = loyaltyEnabled; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public boolean isTaxExempt() { return taxExempt; }
    public void setTaxExempt(boolean taxExempt) { this.taxExempt = taxExempt; }
    public BigDecimal getBadDebtRiskScore() { return badDebtRiskScore; }
    public void setBadDebtRiskScore(BigDecimal badDebtRiskScore) { this.badDebtRiskScore = badDebtRiskScore; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
