package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record ActionExecutionRequest(@NotBlank String type, @NotBlank String actionId) {
}
