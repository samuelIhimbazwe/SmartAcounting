package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "rra_rwanda_settings")
public class RraRwandaSettings {
    @Id
    private UUID tenantId;
    private String tin;
    private String companyTradeName;
    private boolean vatRegistered;
    private boolean turnoverExceedsVatThreshold;
    private boolean amountsTaxInclusive;
    private boolean eisIntegrationEnabled;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getTin() { return tin; }
    public void setTin(String tin) { this.tin = tin; }
    public String getCompanyTradeName() { return companyTradeName; }
    public void setCompanyTradeName(String companyTradeName) { this.companyTradeName = companyTradeName; }
    public boolean isVatRegistered() { return vatRegistered; }
    public void setVatRegistered(boolean vatRegistered) { this.vatRegistered = vatRegistered; }
    public boolean isTurnoverExceedsVatThreshold() { return turnoverExceedsVatThreshold; }
    public void setTurnoverExceedsVatThreshold(boolean turnoverExceedsVatThreshold) { this.turnoverExceedsVatThreshold = turnoverExceedsVatThreshold; }
    public boolean isAmountsTaxInclusive() { return amountsTaxInclusive; }
    public void setAmountsTaxInclusive(boolean amountsTaxInclusive) { this.amountsTaxInclusive = amountsTaxInclusive; }
    public boolean isEisIntegrationEnabled() { return eisIntegrationEnabled; }
    public void setEisIntegrationEnabled(boolean eisIntegrationEnabled) { this.eisIntegrationEnabled = eisIntegrationEnabled; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
