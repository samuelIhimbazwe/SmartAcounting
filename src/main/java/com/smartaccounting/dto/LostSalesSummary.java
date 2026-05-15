package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record LostSalesSummary(
    LocalDate from,
    LocalDate to,
    BigDecimal totalLostRevenue,
    int occurrenceCount,
    List<LostSalesByProduct> byProduct
) {}
