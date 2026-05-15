package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "rra_tax_filings")
public class RraTaxFiling {
    @Id private UUID id;
    private UUID tenantId;
    private String filingType;
    private String period;
    private String status;
    private LocalDate dueDate;
    private String draftPayload;
    private String submittedPayload;
    private String rraAckReference;
    private String lastError;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant submittedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getFilingType() { return filingType; }
    public void setFilingType(String filingType) { this.filingType = filingType; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public String getDraftPayload() { return draftPayload; }
    public void setDraftPayload(String draftPayload) { this.draftPayload = draftPayload; }
    public String getSubmittedPayload() { return submittedPayload; }
    public void setSubmittedPayload(String submittedPayload) { this.submittedPayload = submittedPayload; }
    public String getRraAckReference() { return rraAckReference; }
    public void setRraAckReference(String rraAckReference) { this.rraAckReference = rraAckReference; }
    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
}
