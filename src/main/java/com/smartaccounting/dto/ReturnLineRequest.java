package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record ReturnLineRequest(
    @NotNull UUID productId,
    @NotBlank String sku,
    @NotBlank String productName,
    @NotNull BigDecimal quantity,
    @NotNull BigDecimal unitPrice,
    boolean restock,
    String condition
) {}
