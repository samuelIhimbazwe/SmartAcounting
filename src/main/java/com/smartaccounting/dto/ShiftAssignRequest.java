package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record ShiftAssignRequest(
    @NotNull UUID employeeId,
    @NotNull LocalDate assignedDate,
    String tillCode
) {}
