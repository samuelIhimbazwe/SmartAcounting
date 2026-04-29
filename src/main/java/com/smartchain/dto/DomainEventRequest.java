package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.UUID;

public record DomainEventRequest(
    @NotBlank String aggregateType,
    @NotNull UUID aggregateId,
    @NotBlank String eventType,
    @NotNull Map<String, Object> payload
) {
}
