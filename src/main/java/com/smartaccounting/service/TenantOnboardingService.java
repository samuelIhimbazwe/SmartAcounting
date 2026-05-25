package com.smartaccounting.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dto.rbac.PermissionResponse;
import com.smartaccounting.dto.rbac.RoleResponse;
import com.smartaccounting.dto.rbac.RoleSetupItem;
import com.smartaccounting.dto.rbac.TenantSetupRequest;
import com.smartaccounting.entity.BusinessSize;
import com.smartaccounting.entity.BusinessType;
import com.smartaccounting.entity.Permission;
import com.smartaccounting.entity.Role;
import com.smartaccounting.entity.TenantSetup;
import com.smartaccounting.entity.UserRole;
import com.smartaccounting.entity.UserRoleId;
import com.smartaccounting.repository.PermissionRepository;
import com.smartaccounting.repository.RoleRepository;
import com.smartaccounting.repository.TenantSetupRepository;
import com.smartaccounting.repository.UserRoleRepository;
import com.smartaccounting.service.rbac.RoleTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TenantOnboardingService {
    private final RoleTemplateService roleTemplateService;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final TenantSetupRepository tenantSetupRepository;
    private final TenantPermissionCacheService tenantPermissionCacheService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final RoleProfileService roleProfileService;

    public TenantOnboardingService(
        RoleTemplateService roleTemplateService,
        RoleRepository roleRepository,
        PermissionRepository permissionRepository,
        UserRoleRepository userRoleRepository,
        TenantSetupRepository tenantSetupRepository,
        TenantPermissionCacheService tenantPermissionCacheService,
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        RoleProfileService roleProfileService
    ) {
        this.roleTemplateService = roleTemplateService;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userRoleRepository = userRoleRepository;
        this.tenantSetupRepository = tenantSetupRepository;
        this.tenantPermissionCacheService = tenantPermissionCacheService;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.roleProfileService = roleProfileService;
    }

    public List<RoleTemplate> getRecommendation(UUID tenantId, BusinessSize size, BusinessType type) {
        Objects.requireNonNull(tenantId, "tenantId");
        return roleTemplateService.getRecommendation(size, type);
    }

    @Transactional
    public List<RoleResponse> saveSetup(UUID tenantId, TenantSetupRequest request) {
        validateSetupRequest(request);

        removeUnusedSystemRoles(tenantId);

        List<Role> savedRoles = new ArrayList<>();
        Role ownerRole = null;

        for (RoleSetupItem item : request.roles()) {
            Role role = resolveOrCreateRole(tenantId, item);
            applyRoleSetupItem(role, item);
            Role persisted = roleRepository.save(role);
            savedRoles.add(persisted);
            if (item.isOwner()) {
                ownerRole = persisted;
            }
        }

        if (ownerRole == null) {
            throw new IllegalArgumentException("Owner role was not created");
        }

        assignOwnerRoleToCeo(tenantId, ownerRole.getId());
        upsertTenantSetup(tenantId, request);
        tenantPermissionCacheService.invalidateTenant(tenantId);

        return savedRoles.stream()
            .map(this::toRoleResponse)
            .toList();
    }

    public boolean isSetupComplete(UUID tenantId) {
        return tenantSetupRepository.findByTenantId(tenantId)
            .map(setup -> setup.getCompletedAt() != null)
            .orElse(false);
    }

    private void validateSetupRequest(TenantSetupRequest request) {
        if (request.roles() == null || request.roles().isEmpty()) {
            throw new IllegalArgumentException("At least one role is required");
        }

        long ownerCount = request.roles().stream().filter(RoleSetupItem::isOwner).count();
        if (ownerCount != 1) {
            throw new IllegalArgumentException("Exactly one owner role is required");
        }

        Set<String> allPermissionCodes = permissionRepository.findAll().stream()
            .filter(permission -> permission.getTenantId() == null)
            .map(Permission::getCode)
            .collect(Collectors.toSet());
        if (allPermissionCodes.isEmpty()) {
            throw new IllegalStateException("Permission catalog is empty");
        }

        RoleSetupItem owner = request.roles().stream()
            .filter(RoleSetupItem::isOwner)
            .findFirst()
            .orElseThrow();

        Set<String> ownerCodes = new HashSet<>(distinctCodes(owner.permissionCodes()));
        if (!ownerCodes.equals(allPermissionCodes)) {
            throw new IllegalArgumentException("Owner role must include all permissions");
        }

        for (RoleSetupItem item : request.roles()) {
            resolvePermissions(distinctCodes(item.permissionCodes()));
        }
    }

    private void removeUnusedSystemRoles(UUID tenantId) {
        for (Role role : roleRepository.findByTenantIdAndIsSystemTrue(tenantId)) {
            if (userRoleRepository.countById_RoleId(role.getId()) == 0) {
                roleRepository.delete(role);
            }
        }
    }

    private Role resolveOrCreateRole(UUID tenantId, RoleSetupItem item) {
        if (item.isOwner()) {
            Optional<Role> owner = roleRepository.findByTenantIdAndIsOwnerTrue(tenantId);
            if (owner.isPresent()) {
                return owner.get();
            }
        }
        return roleRepository.findByTenantIdAndName(tenantId, item.name())
            .orElseGet(() -> {
                Role role = new Role();
                role.setId(UUID.randomUUID());
                role.setTenantId(tenantId);
                role.setSystem(true);
                role.setCreatedAt(LocalDateTime.now());
                return role;
            });
    }

    private void applyRoleSetupItem(Role role, RoleSetupItem item) {
        role.setName(item.name());
        role.setDescription(item.description());
        role.setEmoji(item.emoji());
        role.setColour(item.colour());
        role.setOwner(item.isOwner());
        role.setSystem(true);
        role.setUpdatedAt(LocalDateTime.now());
        if (role.getCreatedAt() == null) {
            role.setCreatedAt(LocalDateTime.now());
        }

        RoleProfileService.ResolvedRoleProfile resolved = roleProfileService.resolveForPersist(
            item.roleProfile(),
            distinctCodes(item.permissionCodes()),
            item.name(),
            item.roleProfile() != null ? item.roleProfile().recommendationSource() : "STATIC_TEMPLATE"
        );
        role.setRoleProfileJson(roleProfileService.serialize(resolved.profile()));
        Set<Permission> permissions = new HashSet<>(resolvePermissions(resolved.permissionCodes()));
        role.setPermissions(permissions);
    }

    private List<Permission> resolvePermissions(List<String> codes) {
        List<Permission> permissions = permissionRepository.findAllByCodeIn(codes);
        if (permissions.size() != codes.size()) {
            Set<String> found = permissions.stream().map(Permission::getCode).collect(Collectors.toSet());
            List<String> missing = codes.stream().filter(code -> !found.contains(code)).toList();
            throw new IllegalArgumentException("Unknown permission codes: " + missing);
        }
        return permissions;
    }

    private void assignOwnerRoleToCeo(UUID tenantId, UUID ownerRoleId) {
        UUID ceoUserId = jdbcTemplate.query(
            """
                select id from users
                where tenant_id = ? and self_service_owner = true
                limit 1
                """,
            rs -> rs.next() ? (UUID) rs.getObject("id") : null,
            tenantId
        );
        if (ceoUserId == null) {
            throw new IllegalStateException("Tenant CEO user not found");
        }

        UserRoleId assignmentId = new UserRoleId(ceoUserId, ownerRoleId);
        if (userRoleRepository.existsById(assignmentId)) {
            return;
        }

        UserRole assignment = new UserRole();
        assignment.setId(assignmentId);
        assignment.setAssignedAt(LocalDateTime.now());
        userRoleRepository.save(assignment);
    }

    private void upsertTenantSetup(UUID tenantId, TenantSetupRequest request) {
        TenantSetup setup = tenantSetupRepository.findByTenantId(tenantId).orElseGet(() -> {
            TenantSetup created = new TenantSetup();
            created.setId(UUID.randomUUID());
            created.setTenantId(tenantId);
            created.setCreatedAt(LocalDateTime.now());
            return created;
        });

        setup.setBusinessSize(request.size());
        setup.setBusinessType(request.type());
        setup.setSelectedRoles(serializeRoles(request.roles()));
        setup.setCompletedAt(LocalDateTime.now());
        tenantSetupRepository.save(setup);
    }

    private String serializeRoles(List<RoleSetupItem> roles) {
        try {
            return objectMapper.writeValueAsString(roles);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize setup roles", ex);
        }
    }

    private RoleResponse toRoleResponse(Role role) {
        List<PermissionResponse> permissions = role.getPermissions().stream()
            .sorted((a, b) -> a.getCode().compareTo(b.getCode()))
            .map(p -> new PermissionResponse(
                p.getCode(),
                p.getLabel(),
                p.getDescription(),
                p.getCategory(),
                p.isDangerous(),
                p.isTenantDefined(),
                p.getGrantsPlatformCodes() == null ? List.of() : List.copyOf(p.getGrantsPlatformCodes())
            ))
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

    private static List<String> distinctCodes(List<String> codes) {
        if (codes == null || codes.isEmpty()) {
            throw new IllegalArgumentException("Each role must include at least one permission");
        }
        return codes.stream().distinct().toList();
    }
}
