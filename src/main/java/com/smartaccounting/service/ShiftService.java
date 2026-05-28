package com.smartaccounting.service;

import com.smartaccounting.dto.ShiftAssignmentRequest;
import com.smartaccounting.dto.ShiftRequest;
import com.smartaccounting.entity.Shift;
import com.smartaccounting.entity.ShiftAssignment;
import com.smartaccounting.repository.ShiftAssignmentRepository;
import com.smartaccounting.repository.ShiftRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ShiftService {
    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final JdbcTemplate jdbcTemplate;

    public ShiftService(ShiftRepository shiftRepository,
                        ShiftAssignmentRepository shiftAssignmentRepository,
                        JdbcTemplate jdbcTemplate) {
        this.shiftRepository = shiftRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public Shift createShift(ShiftRequest request) {
        UUID tid = requireTenant();
        String name = request.shiftName() == null ? "" : request.shiftName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Shift name is required");
        }
        if (!request.endTime().isAfter(request.startTime())) {
            throw new IllegalArgumentException("Shift end time must be after start time");
        }
        Shift shift = new Shift();
        shift.setId(UUID.randomUUID());
        shift.setTenantId(tid);
        shift.setShiftName(name);
        shift.setStartTime(request.startTime());
        shift.setEndTime(request.endTime());
        shift.setLocation(trimToNull(request.location()));
        shift.setCreatedAt(Instant.now());
        return shiftRepository.save(shift);
    }

    public ShiftAssignment assignShift(ShiftAssignmentRequest request) {
        UUID tid = requireTenant();
        requireShift(request.shiftId(), tid);
        requireActiveEmployee(request.employeeId(), tid);
        if (request.assignedDate().isBefore(LocalDate.now().minusYears(1))) {
            throw new IllegalArgumentException("Assigned date is too far in the past");
        }
        if (shiftAssignmentRepository.existsByTenantIdAndEmployeeIdAndShiftIdAndAssignedDate(
            tid, request.employeeId(), request.shiftId(), request.assignedDate())) {
            throw new IllegalArgumentException("Employee is already assigned to this shift on that date");
        }
        ShiftAssignment assignment = new ShiftAssignment();
        assignment.setId(UUID.randomUUID());
        assignment.setTenantId(tid);
        assignment.setEmployeeId(request.employeeId());
        assignment.setShiftId(request.shiftId());
        assignment.setAssignedDate(request.assignedDate());
        assignment.setTillCode(trimToNull(request.tillCode()));
        assignment.setStatus("SCHEDULED");
        assignment.setCreatedAt(Instant.now());
        return shiftAssignmentRepository.save(assignment);
    }

    @Transactional(readOnly = true)
    public List<Shift> listShifts() {
        return shiftRepository.findByTenantIdOrderByShiftNameAsc(requireTenant());
    }

    @Transactional(readOnly = true)
    public List<ShiftAssignment> getRoster(LocalDate date) {
        return shiftAssignmentRepository.findByTenantIdAndAssignedDate(requireTenant(), date);
    }

    @Transactional(readOnly = true)
    public List<ShiftAssignment> getRosterWeek(LocalDate weekStart) {
        LocalDate end = weekStart.plusDays(6);
        return shiftAssignmentRepository.findByTenantIdAndAssignedDateBetweenOrderByAssignedDateAsc(
            requireTenant(), weekStart, end);
    }

    private void requireShift(UUID shiftId, UUID tenantId) {
        shiftRepository.findByIdAndTenantId(shiftId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Shift not found"));
    }

    private void requireActiveEmployee(UUID employeeId, UUID tenantId) {
        Integer count = jdbcTemplate.queryForObject(
            """
            select count(*) from hr_employee_profiles
            where tenant_id = ? and id = ? and upper(status) = 'ACTIVE'
            """,
            Integer.class,
            tenantId, employeeId
        );
        if (count == null || count == 0) {
            throw new IllegalArgumentException("Active employee not found");
        }
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
