package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record CopilotQueryRequest(@NotBlank String role, @NotBlank String question) {
}
