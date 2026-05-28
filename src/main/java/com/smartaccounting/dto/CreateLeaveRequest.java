package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateLeaveRequest(
    @NotNull UUID employeeId,
    @NotBlank
    @Pattern(regexp = "ANNUAL|SICK|MATERNITY|UNPAID|OTHER", message = "Invalid leave type")
    String leaveType,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    @Size(max = 500) String reason
) {
}
