package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DisposeAssetRequest(
    @NotNull LocalDate disposedDate,
    @NotNull BigDecimal disposalProceeds
) {}
