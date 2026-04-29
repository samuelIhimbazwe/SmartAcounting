package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
public record NotificationEventRequest(
    @NotBlank String eventType,
    @NotNull Map<String, Object> payload
) {}
