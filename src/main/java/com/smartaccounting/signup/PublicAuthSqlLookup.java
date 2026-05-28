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
 * Cross-tenant auth reads via scalar PostgreSQL helpers (no table-function FROM syntax).
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

    public record RefreshSubjectRow(UUID tenantId, UUID userId) {
    }

    public boolean emailTaken(String email) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "select auth_email_taken(?)",
            Boolean.class,
            normalizeEmail(email)
        ));
    }

    public boolean phoneTaken(String phone) {
        if (phone == null || phone.isBlank()) {
            return false;
        }
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "select auth_phone_taken(?)",
            Boolean.class,
            phone
        ));
    }

    public boolean oauthSubjectTaken(String provider, String subject) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "select auth_oauth_subject_taken(?, ?)",
            Boolean.class,
            provider,
            subject
        ));
    }

    public Optional<AuthUserRow> findUserForAuthentication(String username) {
        return parseUserRow(queryJson("select auth_user_row_json(?)", normalizeUsername(username)));
    }

    public boolean isPasswordBacked(String username) {
        return findUserForAuthentication(username)
            .map(row -> row.passwordHash() != null && !row.passwordHash().isBlank())
            .orElse(false);
    }

    public Optional<LoginIdentityRow> findLoginIdentity(String username) {
        return parseLoginIdentity(queryJson("select auth_login_identity_json(?)", normalizeUsername(username)));
    }

    public Optional<SignupPendingRow> findSignupPendingByPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return Optional.empty();
        }
        return parseSignupPending(queryJson("select auth_signup_pending_json(?)", phone));
    }

    public Optional<String> findResetPhoneByEmail(String email) {
        try {
            String phone = jdbcTemplate.queryForObject(
                "select auth_reset_phone_by_email(?)",
                String.class,
                normalizeEmail(email)
            );
            return Optional.ofNullable(phone).filter(p -> !p.isBlank());
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    public Optional<UUID> findResetTenantByPhone(String phone) {
        return queryUuid("select auth_reset_tenant_by_phone(?)", phone);
    }

    public Optional<UUID> findResetUserByPhone(String phone) {
        return queryUuid("select auth_reset_user_by_phone(?)", phone);
    }

    public Optional<RefreshSubjectRow> findRefreshSubject(String tokenHash) {
        return parseRefreshSubject(queryJson("select auth_refresh_subject_json(?)", tokenHash));
    }

    private String queryJson(String sql, String arg) {
        try {
            return jdbcTemplate.queryForObject(sql, String.class, arg);
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    private Optional<UUID> queryUuid(String sql, String arg) {
        if (arg == null || arg.isBlank()) {
            return Optional.empty();
        }
        try {
            UUID value = jdbcTemplate.queryForObject(sql, UUID.class, arg);
            return Optional.ofNullable(value);
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    private Optional<AuthUserRow> parseUserRow(String json) {
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node.isNull() || node.isMissingNode()) {
                return Optional.empty();
            }
            return Optional.of(new AuthUserRow(
                node.path("username").asText(null),
                node.path("password_hash").asText(null),
                node.path("role").asText(null),
                node.path("self_service_owner").asBoolean(false)
            ));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private Optional<LoginIdentityRow> parseLoginIdentity(String json) {
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node.isNull() || node.isMissingNode()) {
                return Optional.empty();
            }
            return Optional.of(new LoginIdentityRow(
                UUID.fromString(node.path("tenant_id").asText()),
                UUID.fromString(node.path("user_id").asText()),
                node.path("role").asText(null)
            ));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private Optional<SignupPendingRow> parseSignupPending(String json) {
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node.isNull() || node.isMissingNode()) {
                return Optional.empty();
            }
            return Optional.of(new SignupPendingRow(
                UUID.fromString(node.path("tenant_id").asText()),
                UUID.fromString(node.path("user_id").asText()),
                node.path("username").asText(null)
            ));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private Optional<RefreshSubjectRow> parseRefreshSubject(String json) {
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node.isNull() || node.isMissingNode()) {
                return Optional.empty();
            }
            return Optional.of(new RefreshSubjectRow(
                UUID.fromString(node.path("tenant_id").asText()),
                UUID.fromString(node.path("user_id").asText())
            ));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private static String normalizeUsername(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
