package com.smartaccounting.dto.rbac;

import java.util.List;

public record RoleTemplateResponse(
    String name,
    String description,
    String emoji,
    String colour,
    List<String> alwaysPermissions,
    List<String> optionalPermissions
) {}
