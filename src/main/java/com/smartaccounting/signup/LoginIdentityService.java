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

        if (requestTenantId == null || requestTenantId.isBlank()
            || requestUserId == null || requestUserId.isBlank()) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        try {
            return new LoginIdentity(
                UUID.fromString(requestTenantId.trim()),
                UUID.fromString(requestUserId.trim()),
                "CEO"
            );
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid credentials");
        }
    }

    private Optional<LoginIdentity> resolveFromDatabase(String normalizedUsername) {
        if (normalizedUsername.isEmpty()) {
            return Optional.empty();
        }
        LoginIdentity identity = jdbcTemplate.query(
            """
                select tenant_id, user_id, role
                from lookup_login_identity(?)
                """,
            rs -> {
                if (!rs.next()) {
                    return null;
                }
                return new LoginIdentity(
                    (UUID) rs.getObject("tenant_id"),
                    (UUID) rs.getObject("user_id"),
                    rs.getString("role")
                );
            },
            normalizedUsername
        );
        return Optional.ofNullable(identity);
    }

    private boolean isPasswordBacked(String normalizedUsername) {
        if (normalizedUsername.isEmpty()) {
            return false;
        }
        Boolean backed = jdbcTemplate.query(
            """
                select password_hash is not null and length(trim(password_hash)) > 0
                from lookup_user_for_authentication(?)
                """,
            rs -> rs.next() && rs.getBoolean(1),
            normalizedUsername
        );
        return Boolean.TRUE.equals(backed);
    }
}
