package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "inventory_balances")
public class InventoryBalance {
    @Id private UUID id;
    private UUID tenantId;
    private UUID productId;
    private String locationCode;
    private BigDecimal quantity;
    @Version
    private Long version;
    private Instant createdAt;
    private Instant updatedAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getProductId() { return productId; } public void setProductId(UUID productId) { this.productId = productId; }
    public String getLocationCode() { return locationCode; } public void setLocationCode(String locationCode) { this.locationCode = locationCode; }
    public BigDecimal getQuantity() { return quantity; } public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public Long getVersion() { return version; } public void setVersion(Long version) { this.version = version; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
