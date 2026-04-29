package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateDataSharingGrantRequest(
    @NotNull UUID targetTenantId,
    @NotBlank String resourceType,
    @NotBlank String scope
) {
}
