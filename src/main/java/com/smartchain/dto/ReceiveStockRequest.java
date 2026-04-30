package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record ReceiveStockRequest(
    @NotNull UUID productId,
    @NotBlank String location,
    @NotNull BigDecimal quantity,
    @NotBlank String supplierRef
) {}
