package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payroll_lines")
public class PayrollLine {
    @Id private UUID id;
    private UUID tenantId;
    private UUID payrollRunId;
    private UUID employeeId;
    private String employeeName;
    private String department;
    private BigDecimal grossSalary;
    private BigDecimal rssbEmployee;
    private BigDecimal rssbEmployer;
    private BigDecimal maternityInsurance;
    private BigDecimal cbhi;
    private BigDecimal taxableIncome;
    private BigDecimal paye;
    private BigDecimal otherDeductions;
    private BigDecimal otherAdditions;
    private BigDecimal netPay;
    private Integer workingDays;
    private Integer absentDays;
    private BigDecimal overtimeHours;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getPayrollRunId() { return payrollRunId; }
    public void setPayrollRunId(UUID payrollRunId) { this.payrollRunId = payrollRunId; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public BigDecimal getGrossSalary() { return grossSalary; }
    public void setGrossSalary(BigDecimal grossSalary) { this.grossSalary = grossSalary; }
    public BigDecimal getRssbEmployee() { return rssbEmployee; }
    public void setRssbEmployee(BigDecimal rssbEmployee) { this.rssbEmployee = rssbEmployee; }
    public BigDecimal getRssbEmployer() { return rssbEmployer; }
    public void setRssbEmployer(BigDecimal rssbEmployer) { this.rssbEmployer = rssbEmployer; }
    public BigDecimal getMaternityInsurance() { return maternityInsurance; }
    public void setMaternityInsurance(BigDecimal maternityInsurance) { this.maternityInsurance = maternityInsurance; }
    public BigDecimal getCbhi() { return cbhi; }
    public void setCbhi(BigDecimal cbhi) { this.cbhi = cbhi; }
    public BigDecimal getTaxableIncome() { return taxableIncome; }
    public void setTaxableIncome(BigDecimal taxableIncome) { this.taxableIncome = taxableIncome; }
    public BigDecimal getPaye() { return paye; }
    public void setPaye(BigDecimal paye) { this.paye = paye; }
    public BigDecimal getOtherDeductions() { return otherDeductions; }
    public void setOtherDeductions(BigDecimal otherDeductions) { this.otherDeductions = otherDeductions; }
    public BigDecimal getOtherAdditions() { return otherAdditions; }
    public void setOtherAdditions(BigDecimal otherAdditions) { this.otherAdditions = otherAdditions; }
    public BigDecimal getNetPay() { return netPay; }
    public void setNetPay(BigDecimal netPay) { this.netPay = netPay; }
    public Integer getWorkingDays() { return workingDays; }
    public void setWorkingDays(Integer workingDays) { this.workingDays = workingDays; }
    public Integer getAbsentDays() { return absentDays; }
    public void setAbsentDays(Integer absentDays) { this.absentDays = absentDays; }
    public BigDecimal getOvertimeHours() { return overtimeHours; }
    public void setOvertimeHours(BigDecimal overtimeHours) { this.overtimeHours = overtimeHours; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
