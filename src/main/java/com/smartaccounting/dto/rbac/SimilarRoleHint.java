package com.smartaccounting.dto.rbac;

import java.util.List;
import java.util.UUID;

public record SimilarRoleHint(
    UUID roleId,
    String name,
    String emoji,
    int matchPercent,
    String reason,
    List<String> permissionCodes
) {
}
