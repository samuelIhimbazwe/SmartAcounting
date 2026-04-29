package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "projection_rebuild_jobs")
public class ProjectionRebuildJob {
    @Id private UUID id;
    private UUID tenantId;
    private Instant startedAt;
    private Instant completedAt;
    private String status;
    private Instant fromTs;
    private Instant toTs;
    private String detailsJson;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getFromTs() { return fromTs; }
    public void setFromTs(Instant fromTs) { this.fromTs = fromTs; }
    public Instant getToTs() { return toTs; }
    public void setToTs(Instant toTs) { this.toTs = toTs; }
    public String getDetailsJson() { return detailsJson; }
    public void setDetailsJson(String detailsJson) { this.detailsJson = detailsJson; }
}
