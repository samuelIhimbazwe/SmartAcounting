package com.smartaccounting.dto.rbac;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpdateCustomPermissionGrantsRequest(
    @NotNull List<String> grantsPlatformCodes
) {
}
