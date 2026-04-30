package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record ProvisionTenantRequest(@NotBlank String name) {
}
