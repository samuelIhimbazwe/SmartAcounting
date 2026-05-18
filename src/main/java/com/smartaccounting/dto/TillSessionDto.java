package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TillSessionDto(
    UUID id,
    UUID tillId,
    String posRegisterCode,
    UUID cashierId,
    UUID shiftId,
    Instant openedAt,
    Instant closedAt,
    BigDecimal openingFloat,
    BigDecimal closingCash,
    BigDecimal variance,
    String status,
    String notes
) {}
