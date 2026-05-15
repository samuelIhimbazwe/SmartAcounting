package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record AttendanceRequest(
    @NotNull UUID employeeId,
    @NotNull LocalDate attendanceDate,
    String status,
    String notes
) {}
