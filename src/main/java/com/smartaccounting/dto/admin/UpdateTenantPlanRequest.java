package com.smartaccounting.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record UpdateTenantPlanRequest(
    @NotBlank String plan
) {
}
