package com.smartaccounting.oauth2;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public class SocialIdentityRepository {
    private final JdbcTemplate jdbcTemplate;

    public SocialIdentityRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<SocialIdentityRecord> findByProviderAndProviderSubject(String provider, String providerSubject) {
        return jdbcTemplate.query(
            """
                select id, tenant_id, user_id, provider, provider_subject, email, display_name, avatar_url,
                       access_token, last_login_at
                from social_identities
                where provider = ? and provider_subject = ?
                limit 1
                """,
            rs -> rs.next()
                ? Optional.of(new SocialIdentityRecord(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("tenant_id")),
                UUID.fromString(rs.getString("user_id")),
                rs.getString("provider"),
                rs.getString("provider_subject"),
                rs.getString("email"),
                rs.getString("display_name"),
                rs.getString("avatar_url"),
                rs.getString("access_token"),
                rs.getTimestamp("last_login_at") != null
                    ? rs.getTimestamp("last_login_at").toInstant()
                    : null
            ))
                : Optional.empty(),
            provider,
            providerSubject
        );
    }

    public void insert(SocialIdentityRecord identity) {
        jdbcTemplate.update(
            """
                insert into social_identities (
                    id, tenant_id, user_id, provider, provider_subject, email,
                    display_name, avatar_url, access_token, last_login_at, created_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
                """,
            identity.id(),
            identity.tenantId(),
            identity.userId(),
            identity.provider(),
            identity.providerSubject(),
            identity.email(),
            identity.displayName(),
            identity.avatarUrl(),
            identity.accessToken(),
            identity.lastLoginAt() == null ? null : Timestamp.from(identity.lastLoginAt())
        );
    }

    public void updateLogin(SocialIdentityRecord identity) {
        jdbcTemplate.update(
            """
                update social_identities
                set access_token = ?, last_login_at = ?
                where id = ?
                """,
            identity.accessToken(),
            identity.lastLoginAt() == null ? null : Timestamp.from(identity.lastLoginAt()),
            identity.id()
        );
    }
}
