package com.smartaccounting.service;

import com.smartaccounting.dto.ShiftAssignmentRequest;
import com.smartaccounting.dto.ShiftRequest;
import com.smartaccounting.entity.Shift;
import com.smartaccounting.entity.ShiftAssignment;
import com.smartaccounting.repository.ShiftAssignmentRepository;
import com.smartaccounting.repository.ShiftRepository;
import com.smartaccounting.tenant.TenantContext;
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

    public ShiftService(ShiftRepository shiftRepository,
                        ShiftAssignmentRepository shiftAssignmentRepository) {
        this.shiftRepository = shiftRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
    }

    public Shift createShift(ShiftRequest request) {
        UUID tid = requireTenant();
        Shift shift = new Shift();
        shift.setId(UUID.randomUUID());
        shift.setTenantId(tid);
        shift.setShiftName(request.shiftName());
        shift.setStartTime(request.startTime());
        shift.setEndTime(request.endTime());
        shift.setLocation(request.location());
        shift.setCreatedAt(Instant.now());
        return shiftRepository.save(shift);
    }

    public ShiftAssignment assignShift(ShiftAssignmentRequest request) {
        UUID tid = requireTenant();
        ShiftAssignment assignment = new ShiftAssignment();
        assignment.setId(UUID.randomUUID());
        assignment.setTenantId(tid);
        assignment.setEmployeeId(request.employeeId());
        assignment.setShiftId(request.shiftId());
        assignment.setAssignedDate(request.assignedDate());
        assignment.setTillCode(request.tillCode());
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

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
