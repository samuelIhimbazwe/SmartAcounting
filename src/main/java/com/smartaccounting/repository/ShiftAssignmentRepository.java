package com.smartaccounting.repository;

import com.smartaccounting.entity.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, UUID> {
    List<ShiftAssignment> findByTenantIdAndAssignedDate(UUID tenantId, LocalDate assignedDate);
}
