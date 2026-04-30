package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record CopilotAgentRunRequest(
    @NotBlank String role,
    @NotBlank String question,
    Boolean dryRun,
    Boolean approveActions
) {
}
