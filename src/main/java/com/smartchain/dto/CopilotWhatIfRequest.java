package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record CopilotWhatIfRequest(@NotBlank String role, @NotBlank String scenario) {
}
