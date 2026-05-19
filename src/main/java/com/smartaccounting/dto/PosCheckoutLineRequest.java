package com.smartaccounting.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record PosCheckoutLineRequest(
    @NotBlank String barcode,
    @NotNull @DecimalMin(value = "0.001") BigDecimal quantity,
    UUID variantId,
    UUID productId,
    String serialNumber,
    String batchNumber
) {}
