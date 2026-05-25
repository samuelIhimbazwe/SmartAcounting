package com.smartaccounting.service;

import com.smartaccounting.entity.Role;
import com.smartaccounting.entity.UserRole;
import com.smartaccounting.entity.UserRoleId;
import com.smartaccounting.repository.RoleRepository;
import com.smartaccounting.repository.UserRoleRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AdminTenantUserService {
    private static final Set<String> SUPPORTED_ROLES = Set.of(
        "CEO",
        "CFO",
        "SALES",
        "OPERATIONS",
        "HR",
        "MARKETING",
        "ACCOUNTING"
    );

    private final JdbcTemplate jdbcTemplate;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final TenantPermissionCacheService tenantPermissionCacheService;

    public AdminTenantUserService(
        JdbcTemplate jdbcTemplate,
        RoleRepository roleRepository,
        UserRoleRepository userRoleRepository,
        TenantPermissionCacheService tenantPermissionCacheService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.tenantPermissionCacheService = tenantPermissionCacheService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listUsers(UUID tenantId, int page, int size, String query) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        int offset = safePage * safeSize;
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        boolean hasQuery = !normalizedQuery.isEmpty();

        String listSql = hasQuery
            ? "select id, username, role, created_at from users where tenant_id = ? and lower(username) like ? order by created_at desc offset ? limit ?"
            : "select id, username, role, created_at from users where tenant_id = ? order by created_at desc offset ? limit ?";
        String countSql = hasQuery
            ? "select count(*) from users where tenant_id = ? and lower(username) like ?"
            : "select count(*) from users where tenant_id = ?";

        List<Map<String, Object>> content;
        long total;
        if (hasQuery) {
            String like = "%" + normalizedQuery + "%";
            content = jdbcTemplate.query(
                listSql,
                (rs, rowNum) -> toUserMap(
                    tenantId,
                    UUID.fromString(rs.getString("id")),
                    rs.getString("username"),
                    rs.getString("role"),
                    rs.getTimestamp("created_at")
                ),
                tenantId,
                like,
                offset,
                safeSize
            );
            Long count = jdbcTemplate.queryForObject(countSql, Long.class, tenantId, like);
            total = count == null ? 0L : count;
        } else {
            content = jdbcTemplate.query(
                listSql,
                (rs, rowNum) -> toUserMap(
                    tenantId,
                    UUID.fromString(rs.getString("id")),
                    rs.getString("username"),
                    rs.getString("role"),
                    rs.getTimestamp("created_at")
                ),
                tenantId,
                offset,
                safeSize
            );
            Long count = jdbcTemplate.queryForObject(countSql, Long.class, tenantId);
            total = count == null ? 0L : count;
        }

        return Map.of(
            "content", content,
            "totalElements", total,
            "page", safePage,
            "size", safeSize
        );
    }

    @Transactional
    public Map<String, Object> invite(UUID tenantId, String email, String role, UUID roleId) {
        String normalizedEmail = normalizeEmail(email);

        List<Map<String, Object>> existing = jdbcTemplate.query(
            "select id, username, role, created_at from users where tenant_id = ? and lower(username) = ? limit 1",
            (rs, rowNum) -> toUserMap(
                tenantId,
                UUID.fromString(rs.getString("id")),
                rs.getString("username"),
                rs.getString("role"),
                rs.getTimestamp("created_at")
            ),
            tenantId,
            normalizedEmail
        );

        if (!existing.isEmpty()) {
            return Map.of(
                "invited", false,
                "user", existing.get(0)
            );
        }

        Role tenantRole = resolveTenantRole(tenantId, role, roleId);
        String legacyRole = legacyRoleForTenantRole(tenantRole, role);

        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            "insert into users (id, tenant_id, username, role, created_at) values (?, ?, ?, ?, now())",
            id,
            tenantId,
            normalizedEmail,
            legacyRole
        );
        assignUserRole(id, tenantRole);
        tenantPermissionCacheService.invalidateTenant(tenantId);

        return Map.of(
            "invited", true,
            "user", toUserMap(tenantId, id, normalizedEmail, legacyRole, Timestamp.from(Instant.now()))
        );
    }

    @Transactional
    public Map<String, Object> updateRole(UUID tenantId, UUID userId, String role, UUID roleId) {
        Role tenantRole = resolveTenantRole(tenantId, role, roleId);
        String legacyRole = legacyRoleForTenantRole(tenantRole, role);
        int updated = jdbcTemplate.update(
            "update users set role = ? where id = ? and tenant_id = ?",
            legacyRole,
            userId,
            tenantId
        );
        if (updated == 0) {
            throw new IllegalArgumentException("User not found for tenant");
        }
        replaceUserRoles(userId, tenantRole);
        tenantPermissionCacheService.invalidateTenant(tenantId);
        return Map.of(
            "userId", userId,
            "tenantId", tenantId,
            "role", legacyRole,
            "roleId", tenantRole.getId(),
            "roleName", tenantRole.getName(),
            "updatedAt", Instant.now().toString()
        );
    }

    private Role resolveTenantRole(UUID tenantId, String role, UUID roleId) {
        if (roleId != null) {
            return roleRepository.findByIdAndTenantId(roleId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));
        }
        String normalizedRole = normalizeRole(role);
        return roleRepository.findByTenantIdAndName(tenantId, mapLegacyToRoleName(normalizedRole))
            .or(() -> roleRepository.findByTenantIdAndIsOwnerTrue(tenantId))
            .orElseThrow(() -> new IllegalArgumentException(
                "No tenant role configured — complete role setup first"));
    }

    private void assignUserRole(UUID userId, Role role) {
        UserRole assignment = new UserRole();
        assignment.setId(new UserRoleId(userId, role.getId()));
        assignment.setAssignedAt(LocalDateTime.now());
        userRoleRepository.save(assignment);
    }

    private void replaceUserRoles(UUID userId, Role role) {
        for (UserRole existing : userRoleRepository.findAllById_UserId(userId)) {
            userRoleRepository.deleteById_UserIdAndId_RoleId(userId, existing.getId().getRoleId());
        }
        assignUserRole(userId, role);
    }

    private String legacyRoleForTenantRole(Role tenantRole, String requestedLegacy) {
        if (requestedLegacy != null && !requestedLegacy.isBlank()) {
            return normalizeRole(requestedLegacy);
        }
        if (tenantRole.isOwner()) {
            return "CEO";
        }
        String name = tenantRole.getName() == null ? "" : tenantRole.getName().toLowerCase(Locale.ROOT);
        if (name.contains("cashier")) {
            return "SALES";
        }
        if (name.contains("cfo") || name.contains("finance")) {
            return "CFO";
        }
        if (name.contains("account")) {
            return "ACCOUNTING";
        }
        if (name.contains("hr")) {
            return "HR";
        }
        if (name.contains("market")) {
            return "MARKETING";
        }
        if (name.contains("operation") || name.contains("store")) {
            return "OPERATIONS";
        }
        return "SALES";
    }

    private static String mapLegacyToRoleName(String legacyRole) {
        return switch (legacyRole) {
            case "CEO" -> "Business Owner";
            case "CFO" -> "CFO";
            case "SALES" -> "Sales Manager";
            case "OPERATIONS" -> "Operations Manager";
            case "HR" -> "HR Manager";
            case "MARKETING" -> "Marketing Manager";
            case "ACCOUNTING" -> "Accountant";
            default -> legacyRole;
        };
    }

    private Map<String, Object> toUserMap(
        UUID tenantId,
        UUID id,
        String username,
        String role,
        Timestamp createdAt
    ) {
        String email = username == null ? "" : username;
        String roleValue = role == null ? "ACCOUNTING" : role;
        String displayName = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        Map<String, Object> mapped = new LinkedHashMap<>();
        mapped.put("id", id);
        mapped.put("name", displayName.replace('.', ' '));
        mapped.put("email", email);
        mapped.put("role", roleValue);
        mapped.put("status", "ACTIVE");
        mapped.put("createdAt", createdAt == null ? null : createdAt.toInstant().toString());
        List<UserRole> assignments = userRoleRepository.findAllById_UserId(id);
        if (!assignments.isEmpty()) {
            UUID roleId = assignments.get(0).getId().getRoleId();
            roleRepository.findByIdAndTenantId(roleId, tenantId).ifPresent(r -> {
                mapped.put("roleId", r.getId());
                mapped.put("roleName", r.getName());
            });
        }
        return mapped;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("Email is required");
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (!normalized.contains("@")) {
            throw new IllegalArgumentException("Email must be valid");
        }
        return normalized;
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("Role or roleId is required");
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_ROLES.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported role: " + role);
        }
        return normalized;
    }
}
