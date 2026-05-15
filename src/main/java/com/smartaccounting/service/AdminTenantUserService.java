package com.smartaccounting.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
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

    public AdminTenantUserService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
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
    public Map<String, Object> invite(UUID tenantId, String email, String role) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedRole = normalizeRole(role);

        List<Map<String, Object>> existing = jdbcTemplate.query(
            "select id, username, role, created_at from users where tenant_id = ? and lower(username) = ? limit 1",
            (rs, rowNum) -> toUserMap(
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

        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            "insert into users (id, tenant_id, username, role, created_at) values (?, ?, ?, ?, now())",
            id,
            tenantId,
            normalizedEmail,
            normalizedRole
        );

        return Map.of(
            "invited", true,
            "user", toUserMap(id, normalizedEmail, normalizedRole, Timestamp.from(Instant.now()))
        );
    }

    @Transactional
    public Map<String, Object> updateRole(UUID tenantId, UUID userId, String role) {
        String normalizedRole = normalizeRole(role);
        int updated = jdbcTemplate.update(
            "update users set role = ? where id = ? and tenant_id = ?",
            normalizedRole,
            userId,
            tenantId
        );
        if (updated == 0) {
            throw new IllegalArgumentException("User not found for tenant");
        }
        return Map.of(
            "userId", userId,
            "tenantId", tenantId,
            "role", normalizedRole,
            "updatedAt", Instant.now().toString()
        );
    }

    private Map<String, Object> toUserMap(UUID id, String username, String role, Timestamp createdAt) {
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
        if (role == null) {
            throw new IllegalArgumentException("Role is required");
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_ROLES.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported role: " + role);
        }
        return normalized;
    }
}
