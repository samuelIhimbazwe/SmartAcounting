package com.smartaccounting.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
public record NotificationEventRequest(
    @NotBlank String eventType,
    @NotNull Map<String, Object> payload,
    List<String> channels,
    String targetRole
) {
    public NotificationEventRequest(String eventType, Map<String, Object> payload) {
        this(eventType, payload, null, null);
    }
}
