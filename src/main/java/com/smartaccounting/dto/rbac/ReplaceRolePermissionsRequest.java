package com.smartaccounting.dto.rbac;

import java.util.List;

public record ReplaceRolePermissionsRequest(
    List<String> permissionCodes
) {}
