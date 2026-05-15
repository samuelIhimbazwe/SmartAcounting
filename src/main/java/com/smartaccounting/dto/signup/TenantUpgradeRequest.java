package com.smartaccounting.dto.signup;

import jakarta.validation.constraints.NotBlank;

public record TenantUpgradeRequest(
    @NotBlank String requestedPlan
) {
}
