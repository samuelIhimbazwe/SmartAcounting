package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "till_sessions")
public class TillSession {
    @Id private UUID id;
    private UUID tenantId;
    private UUID tillId;
    private String posRegisterCode;
    private UUID cashierId;
    private UUID shiftId;
    private Instant openedAt;
    private Instant closedAt;
    private BigDecimal openingFloat;
    private BigDecimal closingCash;
    private BigDecimal variance;
    private String status;
    private String notes;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getTillId() { return tillId; }
    public void setTillId(UUID tillId) { this.tillId = tillId; }
    public String getPosRegisterCode() { return posRegisterCode; }
    public void setPosRegisterCode(String posRegisterCode) { this.posRegisterCode = posRegisterCode; }
    public UUID getCashierId() { return cashierId; }
    public void setCashierId(UUID cashierId) { this.cashierId = cashierId; }
    public UUID getShiftId() { return shiftId; }
    public void setShiftId(UUID shiftId) { this.shiftId = shiftId; }
    public Instant getOpenedAt() { return openedAt; }
    public void setOpenedAt(Instant openedAt) { this.openedAt = openedAt; }
    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }
    public BigDecimal getOpeningFloat() { return openingFloat; }
    public void setOpeningFloat(BigDecimal openingFloat) { this.openingFloat = openingFloat; }
    public BigDecimal getClosingCash() { return closingCash; }
    public void setClosingCash(BigDecimal closingCash) { this.closingCash = closingCash; }
    public BigDecimal getVariance() { return variance; }
    public void setVariance(BigDecimal variance) { this.variance = variance; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
