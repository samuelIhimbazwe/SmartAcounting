package com.smartaccounting.dto.rbac;

import java.util.List;

public record PermissionCategoryGroup(
    String category,
    List<PermissionResponse> permissions
) {}
