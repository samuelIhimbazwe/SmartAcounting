package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bank_statement_imports")
public class BankStatementImport {
    @Id private UUID id;
    private UUID tenantId;
    private UUID bankAccountId;
    private String filename;
    private UUID importedBy;
    private Integer lineCount;
    private Integer matchedCount;
    private Integer unmatchedCount;
    private String status;
    private Instant importedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getBankAccountId() { return bankAccountId; }
    public void setBankAccountId(UUID bankAccountId) { this.bankAccountId = bankAccountId; }
    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }
    public UUID getImportedBy() { return importedBy; }
    public void setImportedBy(UUID importedBy) { this.importedBy = importedBy; }
    public Integer getLineCount() { return lineCount; }
    public void setLineCount(Integer lineCount) { this.lineCount = lineCount; }
    public Integer getMatchedCount() { return matchedCount; }
    public void setMatchedCount(Integer matchedCount) { this.matchedCount = matchedCount; }
    public Integer getUnmatchedCount() { return unmatchedCount; }
    public void setUnmatchedCount(Integer unmatchedCount) { this.unmatchedCount = unmatchedCount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getImportedAt() { return importedAt; }
    public void setImportedAt(Instant importedAt) { this.importedAt = importedAt; }
}
