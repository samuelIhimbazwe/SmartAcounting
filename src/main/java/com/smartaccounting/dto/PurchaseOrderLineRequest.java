package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseOrderLineRequest(
    @NotNull UUID productId,
    @NotBlank String sku,
    @NotBlank String productName,
    @NotNull BigDecimal orderedQuantity,
    @NotNull BigDecimal unitCost
) {}
