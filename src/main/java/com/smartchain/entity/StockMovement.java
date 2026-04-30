package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_movements")
public class StockMovement {
    @Id private UUID id;
    private UUID tenantId;
    private UUID productId;
    private String fromLocationCode;
    private String toLocationCode;
    private BigDecimal quantity;
    private String movementType;
    private UUID batchId;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getProductId() { return productId; } public void setProductId(UUID productId) { this.productId = productId; }
    public String getFromLocationCode() { return fromLocationCode; } public void setFromLocationCode(String fromLocationCode) { this.fromLocationCode = fromLocationCode; }
    public String getToLocationCode() { return toLocationCode; } public void setToLocationCode(String toLocationCode) { this.toLocationCode = toLocationCode; }
    public BigDecimal getQuantity() { return quantity; } public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getMovementType() { return movementType; } public void setMovementType(String movementType) { this.movementType = movementType; }
    public UUID getBatchId() { return batchId; } public void setBatchId(UUID batchId) { this.batchId = batchId; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
