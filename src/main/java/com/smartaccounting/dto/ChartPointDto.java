package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ChartPointDto(LocalDate date, BigDecimal value, String series) {
}
