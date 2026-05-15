package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record InitiateReturnRequest(
    String originalTransactionId,
    String tillCode,
    @NotBlank String reason,
    @NotBlank String refundMethod,
    String notes,
    @NotEmpty @Valid List<ReturnLineRequest> lines
) {}
