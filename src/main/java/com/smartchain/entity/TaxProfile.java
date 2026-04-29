package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tax_profiles")
public class TaxProfile {
    @Id private UUID id;
    private UUID tenantId;
    private String countryCode;
    private String taxCode;
    private BigDecimal rate;
    private boolean active;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getCountryCode() { return countryCode; } public void setCountryCode(String countryCode) { this.countryCode = countryCode; }
    public String getTaxCode() { return taxCode; } public void setTaxCode(String taxCode) { this.taxCode = taxCode; }
    public BigDecimal getRate() { return rate; } public void setRate(BigDecimal rate) { this.rate = rate; }
    public boolean isActive() { return active; } public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
