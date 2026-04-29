package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "approval_requests")
public class ApprovalRequest {
    @Id private UUID id;
    private UUID tenantId;
    private String requestType;
    private String referenceId;
    private String approverRole;
    private String status;
    private String payload;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getRequestType() { return requestType; } public void setRequestType(String requestType) { this.requestType = requestType; }
    public String getReferenceId() { return referenceId; } public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
    public String getApproverRole() { return approverRole; } public void setApproverRole(String approverRole) { this.approverRole = approverRole; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public String getPayload() { return payload; } public void setPayload(String payload) { this.payload = payload; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
