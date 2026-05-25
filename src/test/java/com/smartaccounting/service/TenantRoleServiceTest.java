package com.smartaccounting.service;

import com.smartaccounting.dto.rbac.UpdateRoleRequest;
import com.smartaccounting.entity.Permission;
import com.smartaccounting.entity.Role;
import com.smartaccounting.exception.RoleConflictException;
import com.smartaccounting.exception.RoleModificationException;
import com.smartaccounting.repository.PermissionRepository;
import com.smartaccounting.repository.RoleRepository;
import com.smartaccounting.repository.UserRoleRepository;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantRoleServiceTest {
    private static final UUID TENANT_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID ROLE_ID = UUID.fromString("22222222-2222-4222-8222-222222222222");

    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private TenantPermissionCacheService tenantPermissionCacheService;
    @Mock
    private RbacResponseMapper rbacResponseMapper;
    @Mock
    private RoleProfileService roleProfileService;

    @InjectMocks
    private TenantRoleService tenantRoleService;

    @BeforeEach
    void setTenant() {
        TenantContext.set(TENANT_ID, UUID.randomUUID());
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void deleteRoleWithUsersThrowsConflict() {
        Role role = ownerLikeRole(false);
        when(roleRepository.findByIdAndTenantId(ROLE_ID, TENANT_ID)).thenReturn(Optional.of(role));
        when(userRoleRepository.countById_RoleId(ROLE_ID)).thenReturn(3L);

        assertThatThrownBy(() -> tenantRoleService.deleteRole(ROLE_ID))
            .isInstanceOf(RoleConflictException.class)
            .hasMessageContaining("3 user(s)")
            .hasMessageContaining("Reassign");

        verify(roleRepository, never()).delete(any());
    }

    @Test
    void updateOwnerRoleNameThrowsModificationException() {
        Role role = ownerLikeRole(true);
        when(roleRepository.findByIdAndTenantId(ROLE_ID, TENANT_ID)).thenReturn(Optional.of(role));

        UpdateRoleRequest request = new UpdateRoleRequest(
            "Renamed Owner",
            role.getDescription(),
            role.getEmoji(),
            role.getColour(),
            role.getPermissions().stream().map(Permission::getCode).toList(),
            null
        );

        assertThatThrownBy(() -> tenantRoleService.updateRole(ROLE_ID, request))
            .isInstanceOf(RoleModificationException.class)
            .hasMessageContaining("Cannot modify owner role name");

        verify(roleRepository, never()).save(any());
    }

    @Test
    void updateOwnerRoleRemovingPermissionThrowsModificationException() {
        Role role = ownerLikeRole(true);
        when(roleRepository.findByIdAndTenantId(ROLE_ID, TENANT_ID)).thenReturn(Optional.of(role));

        List<String> reduced = role.getPermissions().stream()
            .map(Permission::getCode)
            .filter(code -> !code.equals("PERM_1"))
            .toList();

        UpdateRoleRequest request = new UpdateRoleRequest(
            role.getName(),
            role.getDescription(),
            role.getEmoji(),
            role.getColour(),
            reduced,
            null
        );

        assertThatThrownBy(() -> tenantRoleService.updateRole(ROLE_ID, request))
            .isInstanceOf(RoleModificationException.class)
            .hasMessageContaining("Cannot remove permissions from owner role");
    }

    private Role ownerLikeRole(boolean isOwner) {
        Role role = new Role();
        role.setId(ROLE_ID);
        role.setTenantId(TENANT_ID);
        role.setName("Business Owner");
        role.setDescription("Owner");
        role.setEmoji("👑");
        role.setColour("#6366f1");
        role.setOwner(isOwner);
        role.setSystem(true);
        Set<Permission> permissions = new HashSet<>();
        IntStream.rangeClosed(1, 28).forEach(i -> {
            Permission permission = new Permission();
            permission.setId(UUID.randomUUID());
            permission.setCode("PERM_" + i);
            permissions.add(permission);
        });
        role.setPermissions(permissions);
        return role;
    }
}
