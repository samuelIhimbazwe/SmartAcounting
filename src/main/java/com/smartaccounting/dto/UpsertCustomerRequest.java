package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

public record UpsertCustomerRequest(
    @NotBlank String name,
    String phone,
    String email,
    String tinNumber,
    String customerType,
    UUID priceListId,
    BigDecimal creditLimit,
    Boolean loyaltyEnabled,
    String notes
) {}
