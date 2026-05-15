package com.smartaccounting.repository;

import com.smartaccounting.entity.PayrollLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PayrollLineRepository extends JpaRepository<PayrollLine, UUID> {
    List<PayrollLine> findByPayrollRunId(UUID payrollRunId);
    Optional<PayrollLine> findByPayrollRunIdAndEmployeeId(UUID payrollRunId, UUID employeeId);
}
