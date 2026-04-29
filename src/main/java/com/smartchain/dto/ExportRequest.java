package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record ExportRequest(@NotBlank String role, @NotBlank String format) {
}
