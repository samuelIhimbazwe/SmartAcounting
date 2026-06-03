package com.smartaccounting.signup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataAccessException;
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
        return AuthScalarSql.callBoolean(
            jdbcTemplate,
            "auth_email_taken",
            "public_signup_email_taken",
            normalizeEmail(email)
        );
    }

    public boolean phoneTaken(String phone) {
        if (phone == null || phone.isBlank()) {
            return false;
        }
        return AuthScalarSql.callBoolean(
            jdbcTemplate,
            "auth_phone_taken",
            "public_signup_phone_taken",
            phone
        );
    }

    public boolean oauthSubjectTaken(String provider, String subject) {
        return AuthScalarSql.callBoolean(
            jdbcTemplate,
            "auth_oauth_subject_taken",
            "public_signup_oauth_subject_taken",
            provider,
            subject
        );
    }

    public Optional<AuthUserRow> findUserForAuthentication(String username) {
        return parseUserRow(
            queryJson("auth_user_row_json", "lookup_user_for_authentication_json", normalizeUsername(username))
        );
    }

    public boolean isPasswordBacked(String username) {
        return findUserForAuthentication(username)
            .map(row -> row.passwordHash() != null && !row.passwordHash().isBlank())
            .orElse(false);
    }

    public Optional<LoginIdentityRow> findLoginIdentity(String username) {
        String normalized = normalizeUsername(username);
        Optional<LoginIdentityRow> fromScalar = parseLoginIdentity(
            queryJson("auth_login_identity_json", null, normalized)
        );
        if (fromScalar.isPresent()) {
            return fromScalar;
        }
        return findLoginIdentityLegacy(normalized);
    }

    public Optional<SignupPendingRow> findSignupPendingByPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return Optional.empty();
        }
        Optional<SignupPendingRow> fromScalar = parseSignupPending(queryJson("auth_signup_pending_json", null, phone));
        if (fromScalar.isPresent()) {
            return fromScalar;
        }
        return findSignupPendingLegacy(phone);
    }

    public Optional<String> findResetPhoneByEmail(String email) {
        try {
            String phone = AuthScalarSql.callText(
                jdbcTemplate,
                "auth_reset_phone_by_email",
                "lookup_password_reset_phone_by_email_v2",
                normalizeEmail(email)
            );
            return Optional.ofNullable(phone).filter(p -> !p.isBlank());
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    public Optional<UUID> findResetTenantByPhone(String phone) {
        return queryUuid("auth_reset_tenant_by_phone", "lookup_password_reset_tenant_by_phone_v2", phone);
    }

    public Optional<UUID> findResetUserByPhone(String phone) {
        return queryUuid("auth_reset_user_by_phone", "lookup_password_reset_user_id_by_phone_v2", phone);
    }

    public Optional<RefreshSubjectRow> findRefreshSubject(String tokenHash) {
        return parseRefreshSubject(queryJson("auth_refresh_subject_json", null, tokenHash));
    }

    private Optional<LoginIdentityRow> findLoginIdentityLegacy(String username) {
        try {
            return jdbcTemplate.query(
                """
                    SELECT tenant_id, user_id, role
                    FROM lookup_login_identity(?::varchar)
                    LIMIT 1
                    """,
                (rs, rowNum) -> new LoginIdentityRow(
                    rs.getObject("tenant_id", UUID.class),
                    rs.getObject("user_id", UUID.class),
                    rs.getString("role")
                ),
                username
            ).stream().findFirst();
        } catch (DataAccessException ex) {
            return Optional.empty();
        }
    }

    private Optional<SignupPendingRow> findSignupPendingLegacy(String phone) {
        try {
            return jdbcTemplate.query(
                """
                    SELECT tenant_id, user_id, username
                    FROM lookup_signup_pending_by_phone(?::varchar)
                    LIMIT 1
                    """,
                (rs, rowNum) -> new SignupPendingRow(
                    rs.getObject("tenant_id", UUID.class),
                    rs.getObject("user_id", UUID.class),
                    rs.getString("username")
                ),
                phone
            ).stream().findFirst();
        } catch (DataAccessException ex) {
            return Optional.empty();
        }
    }

    private String queryJson(String function, String legacyFunction, String arg) {
        try {
            return AuthScalarSql.callJson(jdbcTemplate, function, legacyFunction, arg);
        } catch (EmptyResultDataAccessException ex) {
            return null;
        } catch (DataAccessException ex) {
            if (legacyFunction == null && AuthScalarSql.isMissingRoutine(ex)) {
                return null;
            }
            throw ex;
        }
    }

    private Optional<UUID> queryUuid(String function, String legacyFunction, String arg) {
        if (arg == null || arg.isBlank()) {
            return Optional.empty();
        }
        try {
            UUID value = AuthScalarSql.callUuid(jdbcTemplate, function, legacyFunction, arg);
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
            if (node.has("tenant_id")) {
                return Optional.of(new LoginIdentityRow(
                    UUID.fromString(node.path("tenant_id").asText()),
                    UUID.fromString(node.path("user_id").asText()),
                    node.path("role").asText(null)
                ));
            }
            return Optional.empty();
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
