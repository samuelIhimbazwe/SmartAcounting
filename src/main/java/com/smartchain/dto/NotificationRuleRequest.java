package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
public record NotificationRuleRequest(
    @NotBlank String eventType,
    @NotNull List<String> channels,
    String targetRole
) {}
