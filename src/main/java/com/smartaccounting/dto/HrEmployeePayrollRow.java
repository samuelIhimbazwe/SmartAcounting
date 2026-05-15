package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record HrEmployeePayrollRow(
    UUID id,
    String fullName,
    String department,
    String status,
    BigDecimal baseSalary,
    boolean deductAbsences
) {}
