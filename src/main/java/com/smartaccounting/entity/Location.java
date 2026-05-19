package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "locations")
public class Location {
    @Id private UUID id;
    private UUID tenantId;
    private String name;
    private String address;
    private String locationCode;
    private String currencyDefault;
    private UUID taxConfigId;
    private String timezone;
    private boolean active;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getLocationCode() { return locationCode; }
    public void setLocationCode(String locationCode) { this.locationCode = locationCode; }
    public String getCurrencyDefault() { return currencyDefault; }
    public void setCurrencyDefault(String currencyDefault) { this.currencyDefault = currencyDefault; }
    public UUID getTaxConfigId() { return taxConfigId; }
    public void setTaxConfigId(UUID taxConfigId) { this.taxConfigId = taxConfigId; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
