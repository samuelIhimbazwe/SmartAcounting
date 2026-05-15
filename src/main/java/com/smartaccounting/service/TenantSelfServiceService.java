package com.smartaccounting.service;

import com.smartaccounting.config.PublicSignupProperties;
import com.smartaccounting.config.TenantPlanLimitsProperties;
import com.smartaccounting.dto.signup.TenantCreateStaffRequest;
import com.smartaccounting.dto.signup.TenantUpgradeRequest;
import com.smartaccounting.dto.signup.TenantUpdateStaffRoleRequest;
import com.smartaccounting.exception.ConflictException;
import com.smartaccounting.signup.PhoneNormalizer;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
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
public class TenantSelfServiceService {
    private static final Set<String> STAFF_ROLES = Set.of(
        "CFO", "SALES", "OPERATIONS", "HR", "MARKETING", "ACCOUNTING"
    );

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final TenantPlanLimitsProperties planLimitsProperties;
    private final SmsDispatchService smsDispatchService;
    private final PublicSignupProperties signupProperties;

    public TenantSelfServiceService(JdbcTemplate jdbcTemplate,
                                    PasswordEncoder passwordEncoder,
                                    TenantPlanLimitsProperties planLimitsProperties,
                                    SmsDispatchService smsDispatchService,
                                    PublicSignupProperties signupProperties) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.planLimitsProperties = planLimitsProperties;
        this.smsDispatchService = smsDispatchService;
        this.signupProperties = signupProperties;
    }

    public Map<String, Object> listStaff(int page, int size, String q) {
        UUID tenantId = requireTenantContext();
        assertTenantAdmin();
        return queryUsers(tenantId, page, size, q);
    }

    @Transactional
    public Map<String, Object> createStaff(TenantCreateStaffRequest req) {
        UUID tenantId = requireTenantContext();
        assertTenantAdmin();
        String role = normalizeStaffRole(req.role());
        String email = normalizeEmail(req.email());
        enforceUserLimit(tenantId);
        UUID id = UUID.randomUUID();
        String hash = passwordEncoder.encode(req.password());
        try {
            jdbcTemplate.update(
                """
                    insert into users (id, tenant_id, username, role, created_at, password_hash, self_service_owner)
                    values (?, ?, ?, ?, now(), ?, false)
                    """,
                id, tenantId, email, role, hash
            );
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException();
        }
        return Map.of(
            "userId", id,
            "email", email,
            "role", role
        );
    }

    @Transactional
    public void deleteStaff(UUID userId) {
        UUID tenantId = requireTenantContext();
        assertTenantAdmin();
        Boolean owner = jdbcTemplate.query(
            """
                select self_service_owner from users where id = ? and tenant_id = ?
                """,
            rs -> rs.next() ? rs.getBoolean("self_service_owner") : null,
            userId, tenantId
        );
        if (Boolean.TRUE.equals(owner)) {
            throw new IllegalArgumentException("Cannot remove tenant owner");
        }
        int n = jdbcTemplate.update("delete from users where id = ? and tenant_id = ?", userId, tenantId);
        if (n == 0) {
            throw new IllegalArgumentException("User not found");
        }
    }

    @Transactional
    public Map<String, Object> updateStaffRole(UUID userId, TenantUpdateStaffRoleRequest req) {
        UUID tenantId = requireTenantContext();
        assertTenantAdmin();
        Boolean owner = jdbcTemplate.query(
            "select self_service_owner from users where id = ? and tenant_id = ?",
            rs -> rs.next() ? rs.getBoolean("self_service_owner") : null,
            userId, tenantId
        );
        if (Boolean.TRUE.equals(owner)) {
            throw new IllegalArgumentException("Cannot change owner role");
        }
        String role = normalizeStaffRole(req.role());
        int n = jdbcTemplate.update(
            "update users set role = ? where id = ? and tenant_id = ?",
            role, userId, tenantId
        );
        if (n == 0) {
            throw new IllegalArgumentException("User not found");
        }
        return Map.of("userId", userId, "role", role);
    }

    public Map<String, Object> billing() {
        UUID tenantId = requireTenantContext();
        assertTenantAdmin();
        return jdbcTemplate.query(
            """
                select id, name, status, plan, trial_ends_at, next_payment_due, phone_verified, created_at
                from tenants where id = ?
                """,
            rs -> {
                if (!rs.next()) {
                    throw new IllegalArgumentException("Tenant not found");
                }
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("tenantId", UUID.fromString(rs.getString("id")));
                m.put("businessName", rs.getString("name"));
                m.put("status", rs.getString("status"));
                m.put("plan", rs.getString("plan"));
                Timestamp trial = rs.getTimestamp("trial_ends_at");
                m.put("trialEndsAt", trial == null ? null : trial.toInstant().toString());
                Timestamp next = rs.getTimestamp("next_payment_due");
                m.put("nextPaymentDue", next == null ? null : next.toInstant().toString());
                m.put("phoneVerified", rs.getBoolean("phone_verified"));
                Timestamp created = rs.getTimestamp("created_at");
                m.put("createdAt", created == null ? null : created.toInstant().toString());
                return m;
            },
            tenantId
        );
    }

    public void requestUpgrade(TenantUpgradeRequest req) {
        UUID tenantId = requireTenantContext();
        assertTenantAdmin();
        Map<String, Object> tenant = jdbcTemplate.queryForMap(
            "select name from tenants where id = ?",
            tenantId
        );
        String businessName = tenant.get("name").toString();
        String phone = jdbcTemplate.query(
            """
                select phone from users where tenant_id = ? and self_service_owner = true limit 1
                """,
            rs -> rs.next() ? rs.getString("phone") : "",
            tenantId
        );
        String plan = req.requestedPlan().trim();
        String adminPhone = signupProperties.getPlatformAdminPhone();
        if (!adminPhone.isBlank()) {
            String msg = "Tenant " + businessName + " wants to upgrade to " + plan + ". Contact: "
                + PhoneNormalizer.normalize(phone == null ? "" : phone);
            smsDispatchService.send(tenantId, UUID.randomUUID(), "UPGRADE_REQUEST",
                List.of(PhoneNormalizer.normalize(adminPhone)), msg);
        }
        if (phone != null && !phone.isBlank()) {
            smsDispatchService.send(tenantId, UUID.randomUUID(), "UPGRADE_CONFIRM",
                List.of(PhoneNormalizer.normalize(phone)),
                "Your upgrade request received. We will contact you within 24 hours.");
        }
    }

    private void enforceUserLimit(UUID tenantId) {
        String plan = jdbcTemplate.query(
            "select plan from tenants where id = ?",
            rs -> rs.next() ? rs.getString("plan") : "TRIAL",
            tenantId
        );
        int max = planLimitsProperties.maxUsersForPlan(plan);
        Long count = jdbcTemplate.queryForObject(
            "select count(*) from users where tenant_id = ?",
            Long.class,
            tenantId
        );
        long c = count == null ? 0L : count;
        if (c >= max) {
            throw new IllegalArgumentException("Plan user limit reached");
        }
    }

    private Map<String, Object> queryUsers(UUID tenantId, int page, int size, String query) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        int offset = safePage * safeSize;
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        boolean hasQuery = !normalizedQuery.isEmpty();

        String listSql = hasQuery
            ? "select id, username, role, created_at, self_service_owner from users where tenant_id = ? and lower(username) like ? order by created_at desc offset ? limit ?"
            : "select id, username, role, created_at, self_service_owner from users where tenant_id = ? order by created_at desc offset ? limit ?";
        String countSql = hasQuery
            ? "select count(*) from users where tenant_id = ? and lower(username) like ?"
            : "select count(*) from users where tenant_id = ?";

        List<Map<String, Object>> content;
        long total;
        if (hasQuery) {
            String like = "%" + normalizedQuery + "%";
            content = jdbcTemplate.query(
                listSql,
                (rs, rowNum) -> row(rs),
                tenantId, like, offset, safeSize
            );
            Long cnt = jdbcTemplate.queryForObject(countSql, Long.class, tenantId, like);
            total = cnt == null ? 0L : cnt;
        } else {
            content = jdbcTemplate.query(listSql, (rs, rowNum) -> row(rs), tenantId, offset, safeSize);
            Long cnt = jdbcTemplate.queryForObject(countSql, Long.class, tenantId);
            total = cnt == null ? 0L : cnt;
        }
        return Map.of(
            "content", content,
            "totalElements", total,
            "page", safePage,
            "size", safeSize
        );
    }

    private static Map<String, Object> row(java.sql.ResultSet rs) throws java.sql.SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", UUID.fromString(rs.getString("id")));
        m.put("username", rs.getString("username"));
        m.put("role", rs.getString("role"));
        Timestamp ts = rs.getTimestamp("created_at");
        m.put("createdAt", ts == null ? null : ts.toInstant().toString());
        m.put("owner", rs.getBoolean("self_service_owner"));
        return m;
    }

    private static UUID requireTenantContext() {
        UUID tid = TenantContext.tenantId();
        if (tid == null) {
            throw new IllegalStateException("Tenant context required");
        }
        return tid;
    }

    private void assertTenantAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new org.springframework.security.access.AccessDeniedException("Denied");
        }
        boolean ok = auth.getAuthorities().stream().anyMatch(a ->
            "ROLE_CEO".equals(a.getAuthority()) || "ROLE_CFO".equals(a.getAuthority()));
        if (!ok) {
            throw new org.springframework.security.access.AccessDeniedException("Denied");
        }
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeStaffRole(String role) {
        if (role == null) {
            throw new IllegalArgumentException("Role is required");
        }
        String r = role.trim().toUpperCase(Locale.ROOT);
        if ("CEO".equals(r)) {
            throw new IllegalArgumentException("Unsupported role");
        }
        if (!STAFF_ROLES.contains(r)) {
            throw new IllegalArgumentException("Unsupported role");
        }
        return r;
    }
}
