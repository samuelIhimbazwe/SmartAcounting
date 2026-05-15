package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "pos_till_closes")
public class PosTillClose {
    @Id private UUID id;
    private UUID tenantId;
    private LocalDate businessDate;
    private String posRegisterCode;
    private BigDecimal countedCash;
    private BigDecimal countedMomo;
    private BigDecimal countedAirtel;
    private BigDecimal countedCard;
    private BigDecimal countedOnAccount;
    private BigDecimal systemCash;
    private BigDecimal systemMomo;
    private BigDecimal systemAirtel;
    private BigDecimal systemCard;
    private BigDecimal systemOnAccount;
    private BigDecimal varianceCash;
    private BigDecimal varianceMomo;
    private BigDecimal varianceAirtel;
    private BigDecimal varianceCard;
    private BigDecimal varianceOnAccount;
    private String notes;
    private Instant closedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public LocalDate getBusinessDate() { return businessDate; }
    public void setBusinessDate(LocalDate businessDate) { this.businessDate = businessDate; }
    public String getPosRegisterCode() { return posRegisterCode; }
    public void setPosRegisterCode(String posRegisterCode) { this.posRegisterCode = posRegisterCode; }
    public BigDecimal getCountedCash() { return countedCash; }
    public void setCountedCash(BigDecimal countedCash) { this.countedCash = countedCash; }
    public BigDecimal getCountedMomo() { return countedMomo; }
    public void setCountedMomo(BigDecimal countedMomo) { this.countedMomo = countedMomo; }
    public BigDecimal getCountedAirtel() { return countedAirtel; }
    public void setCountedAirtel(BigDecimal countedAirtel) { this.countedAirtel = countedAirtel; }
    public BigDecimal getCountedCard() { return countedCard; }
    public void setCountedCard(BigDecimal countedCard) { this.countedCard = countedCard; }
    public BigDecimal getCountedOnAccount() { return countedOnAccount; }
    public void setCountedOnAccount(BigDecimal countedOnAccount) { this.countedOnAccount = countedOnAccount; }
    public BigDecimal getSystemCash() { return systemCash; }
    public void setSystemCash(BigDecimal systemCash) { this.systemCash = systemCash; }
    public BigDecimal getSystemMomo() { return systemMomo; }
    public void setSystemMomo(BigDecimal systemMomo) { this.systemMomo = systemMomo; }
    public BigDecimal getSystemAirtel() { return systemAirtel; }
    public void setSystemAirtel(BigDecimal systemAirtel) { this.systemAirtel = systemAirtel; }
    public BigDecimal getSystemCard() { return systemCard; }
    public void setSystemCard(BigDecimal systemCard) { this.systemCard = systemCard; }
    public BigDecimal getSystemOnAccount() { return systemOnAccount; }
    public void setSystemOnAccount(BigDecimal systemOnAccount) { this.systemOnAccount = systemOnAccount; }
    public BigDecimal getVarianceCash() { return varianceCash; }
    public void setVarianceCash(BigDecimal varianceCash) { this.varianceCash = varianceCash; }
    public BigDecimal getVarianceMomo() { return varianceMomo; }
    public void setVarianceMomo(BigDecimal varianceMomo) { this.varianceMomo = varianceMomo; }
    public BigDecimal getVarianceAirtel() { return varianceAirtel; }
    public void setVarianceAirtel(BigDecimal varianceAirtel) { this.varianceAirtel = varianceAirtel; }
    public BigDecimal getVarianceCard() { return varianceCard; }
    public void setVarianceCard(BigDecimal varianceCard) { this.varianceCard = varianceCard; }
    public BigDecimal getVarianceOnAccount() { return varianceOnAccount; }
    public void setVarianceOnAccount(BigDecimal varianceOnAccount) { this.varianceOnAccount = varianceOnAccount; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }
}
