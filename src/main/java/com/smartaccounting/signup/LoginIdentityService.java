package com.smartaccounting.signup;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Resolves canonical tenant/user/role for login responses (DB password users first; demo map when allowed).
 */
@Service
public class LoginIdentityService {

    public record LoginIdentity(UUID tenantId, UUID userId, String role) {}

    private static final UUID DEMO_TENANT = UUID.fromString("11111111-1111-4111-8111-111111111111");

    private static final Map<String, LoginIdentity> DEMO_IDENTITIES = Map.of(
        "ceo", new LoginIdentity(DEMO_TENANT, UUID.fromString("33333333-3333-4333-8333-333333333301"), "CEO"),
        "cfo", new LoginIdentity(DEMO_TENANT, UUID.fromString("33333333-3333-4333-8333-333333333302"), "CFO"),
        "sales", new LoginIdentity(DEMO_TENANT, UUID.fromString("33333333-3333-4333-8333-333333333303"), "SALES_MANAGER"),
        "ops", new LoginIdentity(DEMO_TENANT, UUID.fromString("33333333-3333-4333-8333-333333333304"), "OPS_MANAGER"),
        "hr", new LoginIdentity(DEMO_TENANT, UUID.fromString("33333333-3333-4333-8333-333333333305"), "HR_MANAGER"),
        "marketing", new LoginIdentity(DEMO_TENANT, UUID.fromString("33333333-3333-4333-8333-333333333306"), "MARKETING_MANAGER"),
        "accounting", new LoginIdentity(DEMO_TENANT, UUID.fromString("33333333-3333-4333-8333-333333333307"), "ACCOUNTING_CONTROLLER")
    );

    private final JdbcTemplate jdbcTemplate;
    private final boolean demoFallbackEnabled;

    public LoginIdentityService(
        JdbcTemplate jdbcTemplate,
        @Value("${smartaccounting.auth.demo-fallback-enabled:true}") boolean demoFallbackEnabled
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.demoFallbackEnabled = demoFallbackEnabled;
    }

    public LoginIdentity resolve(String username, String requestTenantId, String requestUserId) {
        String key = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);

        if (isPasswordBacked(key)) {
            return resolveFromDatabase(key)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        }

        if (demoFallbackEnabled) {
            LoginIdentity demo = DEMO_IDENTITIES.get(key);
            if (demo != null) {
                return demo;
            }
        }

        Optional<LoginIdentity> db = resolveFromDatabase(key);
        if (db.isPresent()) {
            return db.get();
        }

        return new LoginIdentity(
            UUID.fromString(requestTenantId.trim()),
            UUID.fromString(requestUserId.trim()),
            "CEO"
        );
    }

    private Optional<LoginIdentity> resolveFromDatabase(String normalizedUsername) {
        if (normalizedUsername.isEmpty()) {
            return Optional.empty();
        }
        try {
            return Optional.of(jdbcTemplate.queryForObject(
                """
                    select tenant_id, id, role
                    from users
                    where lower(username) = ?
                    limit 1
                    """,
                (rs, rowNum) -> new LoginIdentity(
                    (UUID) rs.getObject("tenant_id"),
                    (UUID) rs.getObject("id"),
                    rs.getString("role")
                ),
                normalizedUsername
            ));
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    private boolean isPasswordBacked(String normalizedUsername) {
        if (normalizedUsername.isEmpty()) {
            return false;
        }
        Boolean backed = jdbcTemplate.query(
            """
                select password_hash is not null and length(trim(password_hash)) > 0
                from users where lower(username) = ? limit 1
                """,
            rs -> {
                if (!rs.next()) {
                    return false;
                }
                return rs.getBoolean(1);
            },
            normalizedUsername
        );
        return Boolean.TRUE.equals(backed);
    }
}
