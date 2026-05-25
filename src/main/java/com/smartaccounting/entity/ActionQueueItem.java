package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "action_queue")
public class ActionQueueItem {
    @Id private UUID id;
    private UUID tenantId;
    private UUID requestedBy;
    private String actionType;
    private String actionRef;
    private String permissionCode;
    private String previewTitle;
    private String previewSummary;
    private String warningMessage;
    private Boolean reversible;
    private String undoActionType;
    @JdbcTypeCode(SqlTypes.JSON)
    private String payload;
    @JdbcTypeCode(SqlTypes.JSON)
    private String undoPayload;
    private String status;
    private String approvalStatus;
    private Instant approvalExpiresAt;
    private Instant approvalDecidedAt;
    private UUID approvalDecidedBy;
    private String approvalReason;
    private String resultEntityType;
    private UUID resultEntityId;
    private String resultSummary;
    private String executionError;
    private Instant createdAt;
    private Instant processedAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getRequestedBy() { return requestedBy; } public void setRequestedBy(UUID requestedBy) { this.requestedBy = requestedBy; }
    public String getActionType() { return actionType; } public void setActionType(String actionType) { this.actionType = actionType; }
    public String getActionRef() { return actionRef; } public void setActionRef(String actionRef) { this.actionRef = actionRef; }
    public String getPermissionCode() { return permissionCode; } public void setPermissionCode(String permissionCode) { this.permissionCode = permissionCode; }
    public String getPreviewTitle() { return previewTitle; } public void setPreviewTitle(String previewTitle) { this.previewTitle = previewTitle; }
    public String getPreviewSummary() { return previewSummary; } public void setPreviewSummary(String previewSummary) { this.previewSummary = previewSummary; }
    public String getWarningMessage() { return warningMessage; } public void setWarningMessage(String warningMessage) { this.warningMessage = warningMessage; }
    public Boolean getReversible() { return reversible; } public void setReversible(Boolean reversible) { this.reversible = reversible; }
    public String getUndoActionType() { return undoActionType; } public void setUndoActionType(String undoActionType) { this.undoActionType = undoActionType; }
    public String getPayload() { return payload; } public void setPayload(String payload) { this.payload = payload; }
    public String getUndoPayload() { return undoPayload; } public void setUndoPayload(String undoPayload) { this.undoPayload = undoPayload; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public String getApprovalStatus() { return approvalStatus; } public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
    public Instant getApprovalExpiresAt() { return approvalExpiresAt; } public void setApprovalExpiresAt(Instant approvalExpiresAt) { this.approvalExpiresAt = approvalExpiresAt; }
    public Instant getApprovalDecidedAt() { return approvalDecidedAt; } public void setApprovalDecidedAt(Instant approvalDecidedAt) { this.approvalDecidedAt = approvalDecidedAt; }
    public UUID getApprovalDecidedBy() { return approvalDecidedBy; } public void setApprovalDecidedBy(UUID approvalDecidedBy) { this.approvalDecidedBy = approvalDecidedBy; }
    public String getApprovalReason() { return approvalReason; } public void setApprovalReason(String approvalReason) { this.approvalReason = approvalReason; }
    public String getResultEntityType() { return resultEntityType; } public void setResultEntityType(String resultEntityType) { this.resultEntityType = resultEntityType; }
    public UUID getResultEntityId() { return resultEntityId; } public void setResultEntityId(UUID resultEntityId) { this.resultEntityId = resultEntityId; }
    public String getResultSummary() { return resultSummary; } public void setResultSummary(String resultSummary) { this.resultSummary = resultSummary; }
    public String getExecutionError() { return executionError; } public void setExecutionError(String executionError) { this.executionError = executionError; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getProcessedAt() { return processedAt; } public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
}
