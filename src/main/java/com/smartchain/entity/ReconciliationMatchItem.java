package com.smartchain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reconciliation_match_items")
public class ReconciliationMatchItem {
    @Id private UUID id;
    private UUID tenantId;
    private String itemType;
    private UUID itemId;
    private BigDecimal amount;
    private boolean matched;
    private String matchGroup;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getItemType() { return itemType; } public void setItemType(String itemType) { this.itemType = itemType; }
    public UUID getItemId() { return itemId; } public void setItemId(UUID itemId) { this.itemId = itemId; }
    public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal amount) { this.amount = amount; }
    public boolean isMatched() { return matched; } public void setMatched(boolean matched) { this.matched = matched; }
    public String getMatchGroup() { return matchGroup; } public void setMatchGroup(String matchGroup) { this.matchGroup = matchGroup; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
