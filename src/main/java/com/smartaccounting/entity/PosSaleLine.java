package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "pos_sale_lines")
public class PosSaleLine {
    @Id private UUID id;
    private UUID tenantId;
    private UUID salesOrderId;
    private UUID catalogItemId;
    private String barcodeSnapshot;
    private String productNameSnapshot;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;
    private BigDecimal netAmount;
    private BigDecimal vatAmount;
    private UUID inventoryBatchId;
    private BigDecimal costPrice;
    private UUID productIdSnapshot;
    private UUID variantId;
    private String serialNumber;
    private String lotCode;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getSalesOrderId() { return salesOrderId; }
    public void setSalesOrderId(UUID salesOrderId) { this.salesOrderId = salesOrderId; }
    public UUID getCatalogItemId() { return catalogItemId; }
    public void setCatalogItemId(UUID catalogItemId) { this.catalogItemId = catalogItemId; }
    public String getBarcodeSnapshot() { return barcodeSnapshot; }
    public void setBarcodeSnapshot(String barcodeSnapshot) { this.barcodeSnapshot = barcodeSnapshot; }
    public String getProductNameSnapshot() { return productNameSnapshot; }
    public void setProductNameSnapshot(String productNameSnapshot) { this.productNameSnapshot = productNameSnapshot; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public BigDecimal getLineTotal() { return lineTotal; }
    public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }
    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }
    public BigDecimal getVatAmount() { return vatAmount; }
    public void setVatAmount(BigDecimal vatAmount) { this.vatAmount = vatAmount; }
    public UUID getInventoryBatchId() { return inventoryBatchId; }
    public void setInventoryBatchId(UUID inventoryBatchId) { this.inventoryBatchId = inventoryBatchId; }
    public BigDecimal getCostPrice() { return costPrice; }
    public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }
    public UUID getProductIdSnapshot() { return productIdSnapshot; }
    public void setProductIdSnapshot(UUID productIdSnapshot) { this.productIdSnapshot = productIdSnapshot; }
    public UUID getVariantId() { return variantId; }
    public void setVariantId(UUID variantId) { this.variantId = variantId; }
    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }
    public String getLotCode() { return lotCode; }
    public void setLotCode(String lotCode) { this.lotCode = lotCode; }
}
