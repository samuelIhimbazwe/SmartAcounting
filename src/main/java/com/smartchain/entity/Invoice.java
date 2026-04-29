package com.smartchain.entity;

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
    private String customerName;
    private BigDecimal amount;
    private String currencyCode;
    private LocalDate dueDate;
    private String status;
    private Instant createdAt;
    private Instant deletedAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getCustomerName() { return customerName; } public void setCustomerName(String customerName) { this.customerName = customerName; }
    public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrencyCode() { return currencyCode; } public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public LocalDate getDueDate() { return dueDate; } public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getDeletedAt() { return deletedAt; } public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
