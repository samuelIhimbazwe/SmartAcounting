package com.smartaccounting.service;

import com.smartaccounting.dto.AttendanceRequest;
import com.smartaccounting.dto.AttendanceSummary;
import com.smartaccounting.entity.AttendanceRecord;
import com.smartaccounting.repository.AttendanceRecordRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AttendanceService {
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final JdbcTemplate jdbcTemplate;

    public AttendanceService(AttendanceRecordRepository attendanceRecordRepository,
                             JdbcTemplate jdbcTemplate) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public AttendanceRecord recordAttendance(AttendanceRequest request, UUID recordedBy) {
        UUID tid = requireTenant();
        AttendanceRecord record = attendanceRecordRepository
            .findByTenantIdAndEmployeeIdAndAttendanceDate(tid, request.employeeId(), request.attendanceDate())
            .orElseGet(AttendanceRecord::new);
        if (record.getId() == null) {
            record.setId(UUID.randomUUID());
            record.setCreatedAt(Instant.now());
        }
        record.setTenantId(tid);
        record.setEmployeeId(request.employeeId());
        record.setAttendanceDate(request.attendanceDate());
        record.setStatus(request.status() != null ? request.status() : "PRESENT");
        record.setNotes(request.notes());
        record.setRecordedBy(recordedBy);
        if ("PRESENT".equals(record.getStatus()) && record.getCheckInTime() == null) {
            record.setCheckInTime(Instant.now());
        }
        return attendanceRecordRepository.save(record);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getAttendance(LocalDate date, UUID employeeId) {
        UUID tid = requireTenant();
        if (employeeId != null) {
            return attendanceRecordRepository.findByTenantIdAndEmployeeIdAndAttendanceDate(tid, employeeId, date)
                .map(List::of)
                .orElse(List.of());
        }
        return attendanceRecordRepository.findByTenantIdAndAttendanceDate(tid, date);
    }

    @Transactional(readOnly = true)
    public AttendanceSummary getMonthlySummary(String period) {
        UUID tid = requireTenant();
        YearMonth ym = YearMonth.parse(period);
        long active = countActiveEmployees(tid);
        long present = attendanceRecordRepository.countDistinctEmployeesByTenantIdAndStatusAndDateBetween(
            tid, "PRESENT", ym.atDay(1), ym.atEndOfMonth());
        long absentEstimate = Math.max(0, active - present);
        return new AttendanceSummary(period, present, absentEstimate, active);
    }

    private long countActiveEmployees(UUID tenantId) {
        Long n = jdbcTemplate.queryForObject(
            "select count(*) from hr_employee_profiles where tenant_id = ? and upper(status) = 'ACTIVE'",
            Long.class,
            tenantId);
        return n == null ? 0L : n;
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
