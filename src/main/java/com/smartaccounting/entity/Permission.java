package com.smartaccounting.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "permissions")
public class Permission {
    @Id
    private UUID id;
    private String code;
    private String label;
    private String description;
    private String category;
    @Column(name = "is_dangerous")
    private boolean isDangerous;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @Column(name = "tenant_id")
    private UUID tenantId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "grants_platform_codes")
    private List<String> grantsPlatformCodes = new ArrayList<>();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public boolean isDangerous() { return isDangerous; }
    public void setDangerous(boolean dangerous) { isDangerous = dangerous; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public List<String> getGrantsPlatformCodes() { return grantsPlatformCodes; }
    public void setGrantsPlatformCodes(List<String> grantsPlatformCodes) {
        this.grantsPlatformCodes = grantsPlatformCodes == null ? new ArrayList<>() : grantsPlatformCodes;
    }
    public boolean isTenantDefined() { return tenantId != null; }
}
