package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public record CopilotAgentRunRequest(
    @NotBlank String role,
    @NotBlank String question,
    Boolean dryRun,
    Boolean approveActions,
    Map<String, Object> uiContext
) {
}
