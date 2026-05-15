package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payroll_runs")
public class PayrollRun {
    @Id private UUID id;
    private UUID tenantId;
    private String period;
    private String status;
    private BigDecimal totalGross;
    private BigDecimal totalRssbEmployee;
    private BigDecimal totalRssbEmployer;
    private BigDecimal totalPaye;
    private BigDecimal totalCbhi;
    private BigDecimal totalMaternity;
    private BigDecimal totalNet;
    private Integer employeeCount;
    private UUID preparedBy;
    private UUID approvedBy;
    private Instant approvedAt;
    private Instant postedAt;
    private Instant paidAt;
    private UUID journalEntryId;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getTotalGross() { return totalGross; }
    public void setTotalGross(BigDecimal totalGross) { this.totalGross = totalGross; }
    public BigDecimal getTotalRssbEmployee() { return totalRssbEmployee; }
    public void setTotalRssbEmployee(BigDecimal totalRssbEmployee) { this.totalRssbEmployee = totalRssbEmployee; }
    public BigDecimal getTotalRssbEmployer() { return totalRssbEmployer; }
    public void setTotalRssbEmployer(BigDecimal totalRssbEmployer) { this.totalRssbEmployer = totalRssbEmployer; }
    public BigDecimal getTotalPaye() { return totalPaye; }
    public void setTotalPaye(BigDecimal totalPaye) { this.totalPaye = totalPaye; }
    public BigDecimal getTotalCbhi() { return totalCbhi; }
    public void setTotalCbhi(BigDecimal totalCbhi) { this.totalCbhi = totalCbhi; }
    public BigDecimal getTotalMaternity() { return totalMaternity; }
    public void setTotalMaternity(BigDecimal totalMaternity) { this.totalMaternity = totalMaternity; }
    public BigDecimal getTotalNet() { return totalNet; }
    public void setTotalNet(BigDecimal totalNet) { this.totalNet = totalNet; }
    public Integer getEmployeeCount() { return employeeCount; }
    public void setEmployeeCount(Integer employeeCount) { this.employeeCount = employeeCount; }
    public UUID getPreparedBy() { return preparedBy; }
    public void setPreparedBy(UUID preparedBy) { this.preparedBy = preparedBy; }
    public UUID getApprovedBy() { return approvedBy; }
    public void setApprovedBy(UUID approvedBy) { this.approvedBy = approvedBy; }
    public Instant getApprovedAt() { return approvedAt; }
    public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }
    public Instant getPostedAt() { return postedAt; }
    public void setPostedAt(Instant postedAt) { this.postedAt = postedAt; }
    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
    public UUID getJournalEntryId() { return journalEntryId; }
    public void setJournalEntryId(UUID journalEntryId) { this.journalEntryId = journalEntryId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
