package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "inventory_batches")
public class InventoryBatch {
    @Id private UUID id;
    private UUID tenantId;
    private UUID productId;
    private String locationCode;
    private String lotCode;
    private LocalDate expiryDate;
    private BigDecimal quantityOnHand;
    private BigDecimal costPrice;
    private Instant createdAt;
    private Instant updatedAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getProductId() { return productId; } public void setProductId(UUID productId) { this.productId = productId; }
    public String getLocationCode() { return locationCode; } public void setLocationCode(String locationCode) { this.locationCode = locationCode; }
    public String getLotCode() { return lotCode; } public void setLotCode(String lotCode) { this.lotCode = lotCode; }
    public LocalDate getExpiryDate() { return expiryDate; } public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
    public BigDecimal getQuantityOnHand() { return quantityOnHand; } public void setQuantityOnHand(BigDecimal quantityOnHand) { this.quantityOnHand = quantityOnHand; }
    public BigDecimal getCostPrice() { return costPrice; } public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
