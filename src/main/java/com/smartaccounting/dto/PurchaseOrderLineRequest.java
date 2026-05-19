package com.smartaccounting.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseOrderLineRequest(
    @NotNull UUID productId,
    UUID variantId,
    @NotNull @JsonProperty("orderedQty") @JsonAlias("orderedQuantity") BigDecimal orderedQty,
    UUID uomId,
    String sku,
    String productName,
    @NotNull BigDecimal unitCost
) {}
