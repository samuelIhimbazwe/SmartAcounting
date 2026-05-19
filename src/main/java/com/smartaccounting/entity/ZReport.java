package com.smartaccounting.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "z_reports")
public class ZReport {
    @Id private UUID id;
    private UUID tenantId;
    private UUID tillSessionId;
    private String reportType;
    private BigDecimal openingFloat;
    private BigDecimal totalSalesCash;
    private BigDecimal totalSalesMomo;
    private BigDecimal totalSalesAirtel;
    private BigDecimal totalSalesCard;
    private BigDecimal totalSalesOnAccount;
    private BigDecimal totalReturns;
    private BigDecimal totalDiscounts;
    private BigDecimal totalVatCollected;
    private BigDecimal closingCash;
    private BigDecimal variance;
    private String cashierName;
    private String registerName;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> payloadJson;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getTillSessionId() { return tillSessionId; }
    public void setTillSessionId(UUID tillSessionId) { this.tillSessionId = tillSessionId; }
    public String getReportType() { return reportType; }
    public void setReportType(String reportType) { this.reportType = reportType; }
    public BigDecimal getOpeningFloat() { return openingFloat; }
    public void setOpeningFloat(BigDecimal openingFloat) { this.openingFloat = openingFloat; }
    public BigDecimal getTotalSalesCash() { return totalSalesCash; }
    public void setTotalSalesCash(BigDecimal totalSalesCash) { this.totalSalesCash = totalSalesCash; }
    public BigDecimal getTotalSalesMomo() { return totalSalesMomo; }
    public void setTotalSalesMomo(BigDecimal totalSalesMomo) { this.totalSalesMomo = totalSalesMomo; }
    public BigDecimal getTotalSalesAirtel() { return totalSalesAirtel; }
    public void setTotalSalesAirtel(BigDecimal totalSalesAirtel) { this.totalSalesAirtel = totalSalesAirtel; }
    public BigDecimal getTotalSalesCard() { return totalSalesCard; }
    public void setTotalSalesCard(BigDecimal totalSalesCard) { this.totalSalesCard = totalSalesCard; }
    public BigDecimal getTotalSalesOnAccount() { return totalSalesOnAccount; }
    public void setTotalSalesOnAccount(BigDecimal totalSalesOnAccount) { this.totalSalesOnAccount = totalSalesOnAccount; }
    public BigDecimal getTotalReturns() { return totalReturns; }
    public void setTotalReturns(BigDecimal totalReturns) { this.totalReturns = totalReturns; }
    public BigDecimal getTotalDiscounts() { return totalDiscounts; }
    public void setTotalDiscounts(BigDecimal totalDiscounts) { this.totalDiscounts = totalDiscounts; }
    public BigDecimal getTotalVatCollected() { return totalVatCollected; }
    public void setTotalVatCollected(BigDecimal totalVatCollected) { this.totalVatCollected = totalVatCollected; }
    public BigDecimal getClosingCash() { return closingCash; }
    public void setClosingCash(BigDecimal closingCash) { this.closingCash = closingCash; }
    public BigDecimal getVariance() { return variance; }
    public void setVariance(BigDecimal variance) { this.variance = variance; }
    public String getCashierName() { return cashierName; }
    public void setCashierName(String cashierName) { this.cashierName = cashierName; }
    public String getRegisterName() { return registerName; }
    public void setRegisterName(String registerName) { this.registerName = registerName; }
    public Map<String, Object> getPayloadJson() { return payloadJson; }
    public void setPayloadJson(Map<String, Object> payloadJson) { this.payloadJson = payloadJson; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
