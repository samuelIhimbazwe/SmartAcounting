package com.smartaccounting.dto;

import com.smartaccounting.dto.rbac.RoleProfileConfig;

import java.util.List;



/**

 * RBAC session payload returned on login, refresh, and {@code GET /auth/me}.

 */

public record AuthSessionProfile(
    String role,
    String tenantId,
    String userId,
    List<String> permissions,
    List<AssignedRoleSummary> assignedRoles,
    RoleProfileConfig effectiveRoleProfile,
    boolean setupComplete
) {}
