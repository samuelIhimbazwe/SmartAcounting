package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDate;
import java.util.List;

public record CreateGrnRequest(
    String notes,
    LocalDate receivedDate,
    @NotEmpty @Valid List<GrnLineRequest> lines
) {}
