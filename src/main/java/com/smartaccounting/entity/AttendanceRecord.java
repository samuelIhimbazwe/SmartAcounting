package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {
    @Id private UUID id;
    private UUID tenantId;
    private UUID employeeId;
    private LocalDate attendanceDate;
    private Instant checkInTime;
    private Instant checkOutTime;
    private LocalTime scheduledStart;
    private LocalTime scheduledEnd;
    private Integer minutesLate;
    private Integer overtimeMinutes;
    private String status;
    private String notes;
    private UUID recordedBy;
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public LocalDate getAttendanceDate() { return attendanceDate; }
    public void setAttendanceDate(LocalDate attendanceDate) { this.attendanceDate = attendanceDate; }
    public Instant getCheckInTime() { return checkInTime; }
    public void setCheckInTime(Instant checkInTime) { this.checkInTime = checkInTime; }
    public Instant getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(Instant checkOutTime) { this.checkOutTime = checkOutTime; }
    public LocalTime getScheduledStart() { return scheduledStart; }
    public void setScheduledStart(LocalTime scheduledStart) { this.scheduledStart = scheduledStart; }
    public LocalTime getScheduledEnd() { return scheduledEnd; }
    public void setScheduledEnd(LocalTime scheduledEnd) { this.scheduledEnd = scheduledEnd; }
    public Integer getMinutesLate() { return minutesLate; }
    public void setMinutesLate(Integer minutesLate) { this.minutesLate = minutesLate; }
    public Integer getOvertimeMinutes() { return overtimeMinutes; }
    public void setOvertimeMinutes(Integer overtimeMinutes) { this.overtimeMinutes = overtimeMinutes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public UUID getRecordedBy() { return recordedBy; }
    public void setRecordedBy(UUID recordedBy) { this.recordedBy = recordedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
