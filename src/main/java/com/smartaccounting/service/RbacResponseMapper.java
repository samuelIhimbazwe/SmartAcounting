package com.smartaccounting.service;

import com.smartaccounting.dto.rbac.PermissionResponse;
import com.smartaccounting.dto.rbac.RoleResponse;
import com.smartaccounting.entity.Permission;
import com.smartaccounting.entity.Role;
import com.smartaccounting.repository.UserRoleRepository;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
public class RbacResponseMapper {
    private final UserRoleRepository userRoleRepository;
    private final RoleProfileService roleProfileService;

    public RbacResponseMapper(UserRoleRepository userRoleRepository, RoleProfileService roleProfileService) {
        this.userRoleRepository = userRoleRepository;
        this.roleProfileService = roleProfileService;
    }

    public RoleResponse toRoleResponse(Role role) {
        List<PermissionResponse> permissions = role.getPermissions().stream()
            .sorted(Comparator.comparing(Permission::getCode))
            .map(this::toPermissionResponse)
            .toList();
        return new RoleResponse(
            role.getId(),
            role.getName(),
            role.getDescription(),
            role.getEmoji(),
            role.getColour(),
            role.isSystem(),
            role.isOwner(),
            roleProfileService.forStoredRole(role),
            permissions,
            userRoleRepository.countById_RoleId(role.getId())
        );
    }

    public PermissionResponse toPermissionResponse(Permission permission) {
        return new PermissionResponse(
            permission.getCode(),
            permission.getLabel(),
            permission.getDescription(),
            permission.getCategory(),
            permission.isDangerous(),
            permission.isTenantDefined(),
            permission.getGrantsPlatformCodes() == null ? List.of() : List.copyOf(permission.getGrantsPlatformCodes())
        );
    }
}
