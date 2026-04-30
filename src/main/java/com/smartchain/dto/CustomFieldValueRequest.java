package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;
public record CustomFieldValueRequest(
    @NotBlank String entityType,
    @NotNull UUID entityId,
    @NotBlank String fieldKey,
    @NotNull Map<String, Object> fieldValue
) {}
