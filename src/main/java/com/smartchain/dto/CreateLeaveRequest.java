package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record CreateLeaveRequest(
    @NotNull UUID employeeId,
    @NotBlank String leaveType,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate
) {
}
