package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ebm_config")
public class EbmConfig {
    @Id private UUID id;
    private UUID tenantId;
    private String ebmTin;
    private String ebmDeviceSerial;
    private String ebmApiUrl;
    private String ebmApiKey;
    private Boolean isActive;
    private Instant lastSyncAt;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getEbmTin() { return ebmTin; }
    public void setEbmTin(String ebmTin) { this.ebmTin = ebmTin; }
    public String getEbmDeviceSerial() { return ebmDeviceSerial; }
    public void setEbmDeviceSerial(String ebmDeviceSerial) { this.ebmDeviceSerial = ebmDeviceSerial; }
    public String getEbmApiUrl() { return ebmApiUrl; }
    public void setEbmApiUrl(String ebmApiUrl) { this.ebmApiUrl = ebmApiUrl; }
    public String getEbmApiKey() { return ebmApiKey; }
    public void setEbmApiKey(String ebmApiKey) { this.ebmApiKey = ebmApiKey; }
    public boolean isActive() { return Boolean.TRUE.equals(isActive); }
    public void setIsActive(Boolean active) { isActive = active; }
    public Instant getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(Instant lastSyncAt) { this.lastSyncAt = lastSyncAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
