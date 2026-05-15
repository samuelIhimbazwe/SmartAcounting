package com.smartaccounting.dto;

import java.math.BigDecimal;

public record LostSalesByProduct(
    String productName,
    String sku,
    int occurrences,
    BigDecimal estimatedLostRevenue
) {}
