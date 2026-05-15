package com.smartaccounting.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreatePosCatalogItemRequest(
    @NotBlank String barcode,
    String sku,
    @NotBlank String displayName,
    @NotNull @DecimalMin(value = "0") BigDecimal unitPrice,
    @NotBlank String currencyCode,
    /** Links this barcode to {@code inventory_balances} for the default retail location. */
    UUID productId,
    /** When set ({@code > 0}), a {@code LOW_STOCK} event is published after a sale if on-hand &le; this. */
    @DecimalMin(value = "0") BigDecimal reorderPoint
) {}