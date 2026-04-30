package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tenant_plugins")
public class TenantPlugin {
    @Id
    private UUID id;
    private UUID tenantId;
    private String pluginKey;
    private String version;
    private boolean enabled;
    private Instant createdAt;
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getPluginKey() { return pluginKey; }
    public void setPluginKey(String pluginKey) { this.pluginKey = pluginKey; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
