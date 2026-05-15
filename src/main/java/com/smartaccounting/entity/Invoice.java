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
@Table(name = "invoices")
public class Invoice {
    @Id private UUID id;
    private UUID tenantId;
    private UUID customerId;
    private String customerName;
    private BigDecimal amount;
    @Column(name = "currency_code", nullable = false, columnDefinition = "bpchar(3)")
    private String currencyCode;
    private LocalDate dueDate;
    private String status;
    private Integer reminderCount;
    private LocalDate lastReminderSentDate;
    private Instant createdAt;
    private Instant deletedAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getCustomerId() { return customerId; } public void setCustomerId(UUID customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; } public void setCustomerName(String customerName) { this.customerName = customerName; }
    public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrencyCode() { return currencyCode; } public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public LocalDate getDueDate() { return dueDate; } public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public Integer getReminderCount() { return reminderCount; } public void setReminderCount(Integer reminderCount) { this.reminderCount = reminderCount; }
    public LocalDate getLastReminderSentDate() { return lastReminderSentDate; } public void setLastReminderSentDate(LocalDate lastReminderSentDate) { this.lastReminderSentDate = lastReminderSentDate; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getDeletedAt() { return deletedAt; } public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
