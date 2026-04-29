package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
public record DeviceEventRequest(
    @NotBlank String deviceType,
    @NotBlank String eventType,
    @NotNull Map<String, Object> payload
) {}
