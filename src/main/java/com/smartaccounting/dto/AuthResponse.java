package com.smartaccounting.dto;

import com.smartaccounting.dto.rbac.RoleProfileConfig;

import java.util.List;



public record AuthResponse(
    String token,
    String tokenType,
    long expiresInSeconds,
    String refreshToken,
    String role,
    String tenantId,
    String userId,
    List<String> permissions,
    List<AssignedRoleSummary> assignedRoles,
    RoleProfileConfig effectiveRoleProfile,
    boolean setupComplete
) {
    public AuthResponse(String token, String tokenType, long expiresInSeconds, String refreshToken) {
        this(token, tokenType, expiresInSeconds, refreshToken, null, null, null, List.of(), List.of(), RoleProfileConfig.empty(), false);
    }
    public static AuthResponse fromSession(
        String token,
        String tokenType,
        long expiresInSeconds,
        String refreshToken,
        AuthSessionProfile session
    ) {
        return new AuthResponse(
            token,
            tokenType,
            expiresInSeconds,
            refreshToken,
            session.role(),
            session.tenantId(),
            session.userId(),
            session.permissions(),
            session.assignedRoles(),
            session.effectiveRoleProfile(),
            session.setupComplete()
        );
    }
}
