package com.smartaccounting.signup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Loads cross-tenant auth rows via SECURITY DEFINER SQL functions (varchar signatures for JDBC).
 */
@Component
public class PublicAuthSqlLookup {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PublicAuthSqlLookup(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public record AuthUserRow(String username, String passwordHash, String role, boolean selfServiceOwner) {
    }

    public record LoginIdentityRow(UUID tenantId, UUID userId, String role) {
    }

    public record SignupPendingRow(UUID tenantId, UUID userId, String username) {
    }

    public Optional<AuthUserRow> findUserForAuthentication(String username) {
        String normalized = normalizeUsername(username);
        if (normalized.isEmpty()) {
            return Optional.empty();
        }
        Optional<AuthUserRow> fromTableFn = queryAuthUserFromTableFunction(normalized);
        if (fromTableFn.isPresent()) {
            return fromTableFn;
        }
        return queryAuthUserFromJsonFunction(normalized);
    }

    public boolean isPasswordBacked(String username) {
        return findUserForAuthentication(username)
            .map(row -> row.passwordHash() != null && !row.passwordHash().isBlank())
            .orElse(false);
    }

    public Optional<LoginIdentityRow> findLoginIdentity(String username) {
        String normalized = normalizeUsername(username);
        if (normalized.isEmpty()) {
            return Optional.empty();
        }
        LoginIdentityRow row = jdbcTemplate.query(
            """
                select li.tenant_id, li.user_id, li.role
                from lookup_login_identity(?) li
                """,
            rs -> {
                if (!rs.next()) {
                    return null;
                }
                return new LoginIdentityRow(
                    (UUID) rs.getObject("tenant_id"),
                    (UUID) rs.getObject("user_id"),
                    rs.getString("role")
                );
            },
            normalized
        );
        return Optional.ofNullable(row);
    }

    public Optional<SignupPendingRow> findSignupPendingByPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return Optional.empty();
        }
        SignupPendingRow row = jdbcTemplate.query(
            """
                select p.tenant_id, p.user_id, p.username
                from lookup_signup_pending_by_phone(?) p
                """,
            rs -> {
                if (!rs.next()) {
                    return null;
                }
                return new SignupPendingRow(
                    (UUID) rs.getObject("tenant_id"),
                    (UUID) rs.getObject("user_id"),
                    rs.getString("username")
                );
            },
            phone
        );
        return Optional.ofNullable(row);
    }

    private Optional<AuthUserRow> queryAuthUserFromTableFunction(String normalized) {
        try {
            AuthUserRow row = jdbcTemplate.queryForObject(
                """
                    select u.username, u.password_hash, u.role, u.self_service_owner
                    from lookup_user_for_authentication(?) u
                    """,
                (rs, rowNum) -> new AuthUserRow(
                    rs.getString("username"),
                    rs.getString("password_hash"),
                    rs.getString("role"),
                    rs.getBoolean("self_service_owner")
                ),
                normalized
            );
            return Optional.of(row);
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        } catch (RuntimeException ex) {
            return Optional.empty();
        }
    }

    private Optional<AuthUserRow> queryAuthUserFromJsonFunction(String normalized) {
        try {
            String json = jdbcTemplate.queryForObject(
                "select lookup_user_for_authentication_json(?)",
                String.class,
                normalized
            );
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }
            JsonNode node = objectMapper.readTree(json);
            return Optional.of(new AuthUserRow(
                node.path("username").asText(null),
                node.path("password_hash").asText(null),
                node.path("role").asText(null),
                node.path("self_service_owner").asBoolean(false)
            ));
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private static String normalizeUsername(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }
}
