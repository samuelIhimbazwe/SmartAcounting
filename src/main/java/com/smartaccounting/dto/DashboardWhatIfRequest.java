package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

public record DashboardWhatIfRequest(@NotBlank String scenario) {
}
