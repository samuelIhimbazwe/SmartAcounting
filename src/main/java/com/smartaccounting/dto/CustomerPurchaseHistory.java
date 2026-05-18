package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CustomerPurchaseHistory(
    String customerName,
    String phone,
    BigDecimal totalSpend,
    int transactionCount,
    BigDecimal avgOrderValue,
    LocalDate lastPurchaseDate
) {}
