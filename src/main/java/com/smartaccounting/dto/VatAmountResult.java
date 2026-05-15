package com.smartaccounting.dto;

import java.math.BigDecimal;

public record VatAmountResult(BigDecimal vatAmount, BigDecimal netAmount, BigDecimal grossAmount) {}
