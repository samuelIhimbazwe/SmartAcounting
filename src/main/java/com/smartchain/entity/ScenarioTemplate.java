package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scenario_templates")
public class ScenarioTemplate {
    @Id private UUID id;
    private UUID tenantId;
    private String role;
    private String name;
    private String assumptionsJson;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getRole() { return role; } public void setRole(String role) { this.role = role; }
    public String getName() { return name; } public void setName(String name) { this.name = name; }
    public String getAssumptionsJson() { return assumptionsJson; } public void setAssumptionsJson(String assumptionsJson) { this.assumptionsJson = assumptionsJson; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
