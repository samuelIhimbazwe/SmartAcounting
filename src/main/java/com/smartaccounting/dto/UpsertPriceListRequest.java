package com.smartaccounting.dto;

import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record UpsertPriceListRequest(
    String name,
    String listType,
    String currencyCode,
    BigDecimal discountPct,
    Instant validFrom,
    Instant validTo,
    Integer minOrderQty,
    Boolean active,
    @Valid List<PriceListLineRequest> lines
) {
}
