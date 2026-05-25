package com.smartaccounting.service;

import com.smartaccounting.dto.rbac.RoleResponse;
import com.smartaccounting.entity.Role;
import com.smartaccounting.entity.UserRole;
import com.smartaccounting.entity.UserRoleId;
import com.smartaccounting.exception.RoleModificationException;
import com.smartaccounting.repository.RoleRepository;
import com.smartaccounting.repository.UserRoleRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class UserRoleAssignmentService {
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final TenantPermissionCacheService tenantPermissionCacheService;
    private final RbacResponseMapper rbacResponseMapper;
    private final JdbcTemplate jdbcTemplate;

    public UserRoleAssignmentService(
        UserRoleRepository userRoleRepository,
        RoleRepository roleRepository,
        TenantPermissionCacheService tenantPermissionCacheService,
        RbacResponseMapper rbacResponseMapper,
        JdbcTemplate jdbcTemplate
    ) {
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
        this.tenantPermissionCacheService = tenantPermissionCacheService;
        this.rbacResponseMapper = rbacResponseMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void assignRole(UUID userId, UUID roleId) {
        UUID tenantId = requireTenantId();
        requireTenantUser(userId, tenantId);
        Role role = roleRepository.findByIdAndTenantId(roleId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        UserRoleId assignmentId = new UserRoleId(userId, role.getId());
        if (userRoleRepository.existsById(assignmentId)) {
            return;
        }

        UserRole assignment = new UserRole();
        assignment.setId(assignmentId);
        assignment.setAssignedBy(TenantContext.userId());
        assignment.setAssignedAt(LocalDateTime.now());
        userRoleRepository.save(assignment);
        tenantPermissionCacheService.invalidateTenant(tenantId);
    }

    @Transactional
    public void removeRole(UUID userId, UUID roleId) {
        UUID tenantId = requireTenantId();
        requireTenantUser(userId, tenantId);
        roleRepository.findByIdAndTenantId(roleId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        if (userRoleRepository.findAllById_UserId(userId).size() <= 1) {
            throw new RoleModificationException("Cannot remove the user's last role");
        }

        UserRoleId assignmentId = new UserRoleId(userId, roleId);
        if (!userRoleRepository.existsById(assignmentId)) {
            throw new IllegalArgumentException("Role assignment not found");
        }

        userRoleRepository.deleteById_UserIdAndId_RoleId(userId, roleId);
        tenantPermissionCacheService.invalidateTenant(tenantId);
    }

    public List<RoleResponse> listUserRoles(UUID userId) {
        UUID tenantId = requireTenantId();
        requireTenantUser(userId, tenantId);

        return userRoleRepository.findAllById_UserId(userId).stream()
            .map(UserRole::getId)
            .map(UserRoleId::getRoleId)
            .map(roleId -> roleRepository.findByIdAndTenantId(roleId, tenantId).orElseThrow())
            .map(rbacResponseMapper::toRoleResponse)
            .toList();
    }

    private void requireTenantUser(UUID userId, UUID tenantId) {
        List<Boolean> rows = jdbcTemplate.query(
            "select true from users where id = ? and tenant_id = ? limit 1",
            (rs, rowNum) -> Boolean.TRUE,
            userId,
            tenantId
        );
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("User not found");
        }
    }

    private UUID requireTenantId() {
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context required");
        }
        return tenantId;
    }
}
