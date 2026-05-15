package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PromotionProductRequest(
    @NotNull UUID productId,
    @NotBlank String sku,
    @NotBlank String productName
) {}
