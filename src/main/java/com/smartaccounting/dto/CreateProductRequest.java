package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateProductRequest(
    @NotBlank String name,
    String sku,
    String unit
) {}
