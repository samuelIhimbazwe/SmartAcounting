package com.smartaccounting.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ebm_audit_log")
public class EbmAuditLog {
    @Id
    private UUID id;
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
    @Column(name = "receipt_id")
    private UUID receiptId;
    @Column(name = "user_id")
    private UUID userId;
    private String action;
    @Column(name = "document_ref")
    private String documentRef;
    @Column(name = "request_payload", columnDefinition = "TEXT")
    private String requestPayload;
    @Column(name = "response_payload", columnDefinition = "TEXT")
    private String responsePayload;
    private String status;
    @Column(name = "sent_at")
    private Instant sentAt;
    @Column(name = "responded_at")
    private Instant respondedAt;
    @Column(name = "error_message")
    private String errorMessage;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getReceiptId() { return receiptId; }
    public void setReceiptId(UUID receiptId) { this.receiptId = receiptId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getDocumentRef() { return documentRef; }
    public void setDocumentRef(String documentRef) { this.documentRef = documentRef; }
    public String getRequestPayload() { return requestPayload; }
    public void setRequestPayload(String requestPayload) { this.requestPayload = requestPayload; }
    public String getResponsePayload() { return responsePayload; }
    public void setResponsePayload(String responsePayload) { this.responsePayload = responsePayload; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
    public Instant getRespondedAt() { return respondedAt; }
    public void setRespondedAt(Instant respondedAt) { this.respondedAt = respondedAt; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
