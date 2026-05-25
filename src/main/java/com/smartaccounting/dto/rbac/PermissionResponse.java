package com.smartaccounting.dto.rbac;

import java.util.List;

public record PermissionResponse(
    String code,
    String label,
    String description,
    String category,
    boolean isDangerous,
    boolean tenantDefined,
    List<String> grantsPlatformCodes
) {
}
