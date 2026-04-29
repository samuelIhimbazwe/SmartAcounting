package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "service_account_api_keys")
public class ServiceAccountApiKey {
    @Id
    private UUID id;
    private UUID tenantId;
    private UUID serviceUserId;
    private String serviceAccountName;
    private String keyPrefix;
    private String keyHash;
    private String scopesCsv;
    private boolean active;
    private Instant expiresAt;
    private Instant createdAt;
    private Instant lastUsedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getServiceUserId() { return serviceUserId; }
    public void setServiceUserId(UUID serviceUserId) { this.serviceUserId = serviceUserId; }
    public String getServiceAccountName() { return serviceAccountName; }
    public void setServiceAccountName(String serviceAccountName) { this.serviceAccountName = serviceAccountName; }
    public String getKeyPrefix() { return keyPrefix; }
    public void setKeyPrefix(String keyPrefix) { this.keyPrefix = keyPrefix; }
    public String getKeyHash() { return keyHash; }
    public void setKeyHash(String keyHash) { this.keyHash = keyHash; }
    public String getScopesCsv() { return scopesCsv; }
    public void setScopesCsv(String scopesCsv) { this.scopesCsv = scopesCsv; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(Instant lastUsedAt) { this.lastUsedAt = lastUsedAt; }
}
