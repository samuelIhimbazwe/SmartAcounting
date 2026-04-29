package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record CreateWorkflowRuleRequest(
    @NotBlank String name,
    @NotBlank String triggerEvent,
    @NotNull Map<String, Object> conditions,
    @NotNull Map<String, Object> actions,
    boolean active
) {
}
