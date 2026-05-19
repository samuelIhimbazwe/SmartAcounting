package com.smartaccounting.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sales_orders")
public class SalesOrder {
    @Id
    private UUID id;
    private UUID tenantId;
    private String customerName;
    private String status;
    private BigDecimal totalAmount;
    private BigDecimal netAmount;
    private BigDecimal vatAmount;
    private String fiscalSignature;
    private String fiscalQrData;
    private boolean taxExemptSale;
    @Column(name = "currency_code", nullable = false, columnDefinition = "bpchar(3)")
    private String currencyCode;
    /** DIRECT | POS | ... */
    private String salesChannel;
    private String posRegisterCode;
    private UUID tillSessionId;
    private Instant createdAt;
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }
    public BigDecimal getVatAmount() { return vatAmount; }
    public void setVatAmount(BigDecimal vatAmount) { this.vatAmount = vatAmount; }
    public String getFiscalSignature() { return fiscalSignature; }
    public void setFiscalSignature(String fiscalSignature) { this.fiscalSignature = fiscalSignature; }
    public String getFiscalQrData() { return fiscalQrData; }
    public void setFiscalQrData(String fiscalQrData) { this.fiscalQrData = fiscalQrData; }
    public boolean isTaxExemptSale() { return taxExemptSale; }
    public void setTaxExemptSale(boolean taxExemptSale) { this.taxExemptSale = taxExemptSale; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public String getSalesChannel() { return salesChannel; }
    public void setSalesChannel(String salesChannel) { this.salesChannel = salesChannel; }
    public String getPosRegisterCode() { return posRegisterCode; }
    public void setPosRegisterCode(String posRegisterCode) { this.posRegisterCode = posRegisterCode; }
    public UUID getTillSessionId() { return tillSessionId; }
    public void setTillSessionId(UUID tillSessionId) { this.tillSessionId = tillSessionId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
