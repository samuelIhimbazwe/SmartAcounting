package com.smartaccounting.service;

import com.smartaccounting.dto.rbac.CreateRoleRequest;
import com.smartaccounting.dto.rbac.PermissionCategoryGroup;
import com.smartaccounting.dto.rbac.PermissionResponse;
import com.smartaccounting.dto.rbac.RoleResponse;
import com.smartaccounting.dto.rbac.UpdateRoleRequest;
import com.smartaccounting.entity.Permission;
import com.smartaccounting.entity.Role;
import com.smartaccounting.exception.RoleConflictException;
import com.smartaccounting.exception.RoleModificationException;
import com.smartaccounting.repository.PermissionRepository;
import com.smartaccounting.repository.RoleRepository;
import com.smartaccounting.repository.UserRoleRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TenantRoleService {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final TenantPermissionCacheService tenantPermissionCacheService;
    private final RbacResponseMapper rbacResponseMapper;
    private final RoleProfileService roleProfileService;

    public TenantRoleService(
        RoleRepository roleRepository,
        PermissionRepository permissionRepository,
        UserRoleRepository userRoleRepository,
        TenantPermissionCacheService tenantPermissionCacheService,
        RbacResponseMapper rbacResponseMapper,
        RoleProfileService roleProfileService
    ) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userRoleRepository = userRoleRepository;
        this.tenantPermissionCacheService = tenantPermissionCacheService;
        this.rbacResponseMapper = rbacResponseMapper;
        this.roleProfileService = roleProfileService;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> listRoles() {
        UUID tenantId = requireTenantId();
        return roleRepository.findAllByTenantId(tenantId).stream()
            .sorted(Comparator.comparing(Role::getName, String.CASE_INSENSITIVE_ORDER))
            .map(rbacResponseMapper::toRoleResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public RoleResponse getRole(UUID roleId) {
        Role role = requireTenantRole(roleId);
        return rbacResponseMapper.toRoleResponse(role);
    }

    @Transactional
    public RoleResponse createRole(CreateRoleRequest request) {
        UUID tenantId = requireTenantId();
        String name = normalizeName(request.name());
        if (roleRepository.findByTenantIdAndName(tenantId, name).isPresent()) {
            throw new RoleConflictException("Role name already exists for this tenant");
        }

        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setTenantId(tenantId);
        role.setName(name);
        role.setDescription(request.description());
        role.setEmoji(request.emoji());
        role.setColour(request.colour());
        role.setSystem(false);
        role.setOwner(false);
        role.setCreatedAt(LocalDateTime.now());
        role.setUpdatedAt(LocalDateTime.now());
        RoleProfileService.ResolvedRoleProfile resolved = roleProfileService.resolveForPersist(
            request.roleProfile(),
            distinctCodes(request.permissionCodes()),
            name,
            request.roleProfile() != null ? request.roleProfile().recommendationSource() : "ADMIN_AUTHORED"
        );
        role.setRoleProfileJson(roleProfileService.serialize(resolved.profile()));
        role.setPermissions(new HashSet<>(resolvePermissions(tenantId, resolved.permissionCodes())));

        Role saved = roleRepository.save(role);
        tenantPermissionCacheService.invalidateTenant(tenantId);
        return rbacResponseMapper.toRoleResponse(saved);
    }

    @Transactional
    public RoleResponse updateRole(UUID roleId, UpdateRoleRequest request) {
        UUID tenantId = requireTenantId();
        Role role = requireTenantRole(roleId);
        String name = normalizeName(request.name());

        if (role.isOwner()) {
            if (!role.getName().equals(name)) {
                throw new RoleModificationException("Cannot modify owner role name");
            }
            validateOwnerPermissionsPreserved(role, distinctCodes(request.permissionCodes()));
        } else if (!role.getName().equals(name)
            && roleRepository.findByTenantIdAndName(tenantId, name).isPresent()) {
            throw new RoleConflictException("Role name already exists for this tenant");
        }

        role.setName(name);
        role.setDescription(request.description());
        role.setEmoji(request.emoji());
        role.setColour(request.colour());
        role.setUpdatedAt(LocalDateTime.now());
        RoleProfileService.ResolvedRoleProfile resolved = roleProfileService.resolveForPersist(
            request.roleProfile() != null ? request.roleProfile() : roleProfileService.deserialize(role.getRoleProfileJson()),
            distinctCodes(request.permissionCodes()),
            name,
            request.roleProfile() != null && request.roleProfile().recommendationSource() != null
                ? request.roleProfile().recommendationSource()
                : "ADMIN_AUTHORED"
        );
        role.setRoleProfileJson(roleProfileService.serialize(resolved.profile()));
        role.setPermissions(new HashSet<>(resolvePermissions(tenantId, resolved.permissionCodes())));

        Role saved = roleRepository.save(role);
        tenantPermissionCacheService.invalidateRole(tenantId, saved.getName());
        return rbacResponseMapper.toRoleResponse(saved);
    }

    @Transactional
    public void deleteRole(UUID roleId) {
        UUID tenantId = requireTenantId();
        Role role = requireTenantRole(roleId);

        if (role.isOwner()) {
            throw new RoleModificationException("Cannot delete owner role");
        }

        long userCount = userRoleRepository.countById_RoleId(roleId);
        if (userCount > 0) {
            throw new RoleConflictException(
                "Role is assigned to " + userCount + " user(s). Reassign those users before deleting this role."
            );
        }

        roleRepository.delete(role);
        tenantPermissionCacheService.invalidateTenant(tenantId);
    }

    @Transactional
    public RoleResponse replacePermissions(UUID roleId, List<String> permissionCodes) {
        Role role = requireTenantRole(roleId);
        UpdateRoleRequest update = new UpdateRoleRequest(
            role.getName(),
            role.getDescription(),
            role.getEmoji(),
            role.getColour(),
            permissionCodes,
            roleProfileService.forStoredRole(role)
        );
        return updateRole(roleId, update);
    }

    public List<PermissionCategoryGroup> listPermissionsByCategory() {
        UUID tenantId = requireTenantId();
        List<Permission> catalog = new ArrayList<>(permissionRepository.findAll().stream()
            .filter(permission -> permission.getTenantId() == null)
            .toList());
        catalog.addAll(permissionRepository.findAllByTenantIdOrderByLabelAsc(tenantId));
        return catalog.stream()
            .sorted(Comparator.comparing(Permission::getCategory).thenComparing(Permission::getLabel))
            .collect(Collectors.groupingBy(Permission::getCategory))
            .entrySet().stream()
            .sorted(Comparator.comparing(entry -> entry.getKey()))
            .map(entry -> new PermissionCategoryGroup(
                entry.getKey(),
                entry.getValue().stream().map(rbacResponseMapper::toPermissionResponse).toList()
            ))
            .toList();
    }

    private Role requireTenantRole(UUID roleId) {
        UUID tenantId = requireTenantId();
        return roleRepository.findByIdAndTenantId(roleId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Role not found"));
    }

    private UUID requireTenantId() {
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context required");
        }
        return tenantId;
    }

    private void validateOwnerPermissionsPreserved(Role role, List<String> requestedCodes) {
        Set<String> current = role.getPermissions().stream()
            .map(Permission::getCode)
            .collect(Collectors.toSet());
        Set<String> requested = new HashSet<>(requestedCodes);
        if (!requested.containsAll(current)) {
            throw new RoleModificationException("Cannot remove permissions from owner role");
        }
    }

    private List<Permission> resolvePermissions(UUID tenantId, List<String> codes) {
        List<String> normalized = codes.stream()
            .map(code -> code.trim().toUpperCase(java.util.Locale.ROOT))
            .toList();
        List<Permission> permissions = permissionRepository.findAllByCodeInForTenant(normalized, tenantId);
        if (permissions.size() != normalized.size()) {
            Set<String> found = permissions.stream().map(Permission::getCode).collect(Collectors.toSet());
            List<String> missing = normalized.stream().filter(code -> !found.contains(code)).toList();
            throw new IllegalArgumentException("Unknown permission codes: " + missing);
        }
        return permissions;
    }

    private static List<String> distinctCodes(List<String> codes) {
        if (codes == null || codes.isEmpty()) {
            throw new IllegalArgumentException("At least one permission is required");
        }
        return codes.stream().distinct().toList();
    }

    private static String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Role name is required");
        }
        return name.trim();
    }
}
