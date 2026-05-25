package com.smartaccounting.service;

import com.smartaccounting.dto.AssignedRoleSummary;
import com.smartaccounting.dto.AuthSessionProfile;
import com.smartaccounting.entity.Role;
import com.smartaccounting.entity.UserRole;
import com.smartaccounting.repository.RoleRepository;
import com.smartaccounting.repository.UserRoleRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class AuthSessionService {
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final TenantPermissionCacheService tenantPermissionCacheService;
    private final PermissionExpansionService permissionExpansionService;
    private final LegacyRolePermissionMapper legacyRolePermissionMapper;
    private final DashboardRoleResolver dashboardRoleResolver;
    private final TenantOnboardingService tenantOnboardingService;
    private final JdbcTemplate jdbcTemplate;
    private final RoleProfileService roleProfileService;

    public AuthSessionService(
        UserRoleRepository userRoleRepository,
        RoleRepository roleRepository,
        TenantPermissionCacheService tenantPermissionCacheService,
        PermissionExpansionService permissionExpansionService,
        LegacyRolePermissionMapper legacyRolePermissionMapper,
        DashboardRoleResolver dashboardRoleResolver,
        TenantOnboardingService tenantOnboardingService,
        JdbcTemplate jdbcTemplate,
        RoleProfileService roleProfileService
    ) {
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
        this.tenantPermissionCacheService = tenantPermissionCacheService;
        this.permissionExpansionService = permissionExpansionService;
        this.legacyRolePermissionMapper = legacyRolePermissionMapper;
        this.dashboardRoleResolver = dashboardRoleResolver;
        this.tenantOnboardingService = tenantOnboardingService;
        this.jdbcTemplate = jdbcTemplate;
        this.roleProfileService = roleProfileService;
    }

    @Transactional(readOnly = true)
    public AuthSessionProfile buildSession(UUID tenantId, UUID userId) {
        String legacyRole = loadLegacyUsersRole(userId);
        LoadedAssignedRoles assignedRoleData = loadAssignedRoles(tenantId, userId);
        Set<String> permissions = loadEffectivePermissions(tenantId, userId, legacyRole);
        String dashboardRole = dashboardRoleResolver.resolvePrimaryDashboardRole(permissions, legacyRole);
        boolean setupComplete = tenantOnboardingService.isSetupComplete(tenantId);
        return new AuthSessionProfile(
            dashboardRole,
            tenantId.toString(),
            userId.toString(),
            permissions.stream().sorted().toList(),
            assignedRoleData.summaries(),
            roleProfileService.resolveEffectiveProfile(assignedRoleData.roles(), permissions, legacyRole, dashboardRole),
            setupComplete
        );
    }

    public Set<String> loadEffectivePermissions(UUID tenantId, UUID userId, String legacyRole) {
        Set<String> cached = tenantPermissionCacheService.getPermissions(tenantId, userId);
        if (cached != null && !cached.isEmpty()) {
            return cached;
        }
        Set<String> fromDb = new LinkedHashSet<>(userRoleRepository.findPermissionCodesByUserId(userId));
        if (fromDb.isEmpty()) {
            String legacy = legacyRole != null && !legacyRole.isBlank()
                ? legacyRole
                : loadLegacyUsersRole(userId);
            if (legacy != null && !legacy.isBlank()) {
                fromDb.addAll(legacyRolePermissionMapper.permissionsForLegacyRole(legacy));
            }
        }
        Set<String> expanded = permissionExpansionService.expandForTenant(tenantId, fromDb);
        tenantPermissionCacheService.putPermissions(tenantId, userId, expanded);
        return expanded;
    }

    private LoadedAssignedRoles loadAssignedRoles(UUID tenantId, UUID userId) {
        List<AssignedRoleSummary> summaries = new ArrayList<>();
        List<Role> roles = new ArrayList<>();
        for (UserRole assignment : userRoleRepository.findAllById_UserId(userId)) {
            UUID roleId = assignment.getId().getRoleId();
            Role role = roleRepository.findByIdAndTenantId(roleId, tenantId).orElse(null);
            if (role != null) {
                roles.add(role);
                summaries.add(new AssignedRoleSummary(role.getId(), role.getName(), role.isOwner()));
            }
        }
        if (summaries.isEmpty() && legacyRoleLabel(userId) != null) {
            summaries.add(new AssignedRoleSummary(null, legacyRoleLabel(userId), "CEO".equalsIgnoreCase(legacyRoleLabel(userId))));
        }
        return new LoadedAssignedRoles(List.copyOf(summaries), List.copyOf(roles));
    }

    private String legacyRoleLabel(UUID userId) {
        String legacy = loadLegacyUsersRole(userId);
        if (legacy == null || legacy.isBlank()) {
            return null;
        }
        return legacy.trim();
    }

    private String loadLegacyUsersRole(UUID userId) {
        List<String> rows = jdbcTemplate.query(
            "select role from users where id = ? limit 1",
            (rs, rowNum) -> rs.getString("role"),
            userId
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    private record LoadedAssignedRoles(List<AssignedRoleSummary> summaries, List<Role> roles) {
    }
}
