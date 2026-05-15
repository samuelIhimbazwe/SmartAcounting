package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record ShiftAssignmentRequest(
    @NotNull UUID employeeId,
    @NotNull UUID shiftId,
    @NotNull LocalDate assignedDate,
    String tillCode
) {}
