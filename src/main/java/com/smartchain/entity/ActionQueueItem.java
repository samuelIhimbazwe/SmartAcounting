package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "action_queue")
public class ActionQueueItem {
    @Id private UUID id;
    private UUID tenantId;
    private String actionType;
    private String actionRef;
    private String payload;
    private String status;
    private String approvalStatus;
    private Instant approvalExpiresAt;
    private Instant approvalDecidedAt;
    private UUID approvalDecidedBy;
    private String approvalReason;
    private Instant createdAt;
    private Instant processedAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getActionType() { return actionType; } public void setActionType(String actionType) { this.actionType = actionType; }
    public String getActionRef() { return actionRef; } public void setActionRef(String actionRef) { this.actionRef = actionRef; }
    public String getPayload() { return payload; } public void setPayload(String payload) { this.payload = payload; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public String getApprovalStatus() { return approvalStatus; } public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
    public Instant getApprovalExpiresAt() { return approvalExpiresAt; } public void setApprovalExpiresAt(Instant approvalExpiresAt) { this.approvalExpiresAt = approvalExpiresAt; }
    public Instant getApprovalDecidedAt() { return approvalDecidedAt; } public void setApprovalDecidedAt(Instant approvalDecidedAt) { this.approvalDecidedAt = approvalDecidedAt; }
    public UUID getApprovalDecidedBy() { return approvalDecidedBy; } public void setApprovalDecidedBy(UUID approvalDecidedBy) { this.approvalDecidedBy = approvalDecidedBy; }
    public String getApprovalReason() { return approvalReason; } public void setApprovalReason(String approvalReason) { this.approvalReason = approvalReason; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getProcessedAt() { return processedAt; } public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
}
