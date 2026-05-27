package com.smartaccounting.signup;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.UUID;

@Component
public class DbUserLoginValidator {
    private final JdbcTemplate jdbcTemplate;

    public DbUserLoginValidator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Ensures JWT tenant/user claims match the password-backed user row (prevents cross-tenant token minting).
     */
    public void validateTenantUserMatches(String username, String tenantId, String userId) {
        if (username == null || tenantId == null || userId == null) {
            return;
        }
        String un = username.trim().toLowerCase(Locale.ROOT);
        Boolean passwordBacked = jdbcTemplate.query(
            """
                select f.password_hash is not null and length(trim(f.password_hash)) > 0
                from lookup_user_for_authentication(?::text) as f(
                    username, password_hash, role, self_service_owner
                )
                """,
            rs -> rs.next() && rs.getBoolean(1),
            un
        );
        if (!Boolean.TRUE.equals(passwordBacked)) {
            return;
        }
        UUID tid = parseUuid(tenantId);
        UUID uid = parseUuid(userId);
        Boolean ok = jdbcTemplate.query(
            """
                select count(*) > 0
                from lookup_login_identity(?::text) as li(tenant_id, user_id, role)
                where li.tenant_id = ? and li.user_id = ?
                """,
            rs -> {
                rs.next();
                return rs.getBoolean(1);
            },
            un, tid, uid
        );
        if (!Boolean.TRUE.equals(ok)) {
            throw new IllegalArgumentException("Invalid credentials");
        }
    }

    private static UUID parseUuid(String s) {
        try {
            return UUID.fromString(s.trim());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid credentials");
        }
    }
}
