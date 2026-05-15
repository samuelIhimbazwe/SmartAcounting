package com.smartaccounting.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record BarcodeLabelBatchItemRequest(
    @NotNull UUID productId,
    @NotNull @Min(1) Integer quantity
) {}
