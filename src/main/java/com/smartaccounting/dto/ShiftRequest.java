package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record ShiftRequest(
    @NotBlank String shiftName,
    @NotNull LocalTime startTime,
    @NotNull LocalTime endTime,
    String location
) {}
