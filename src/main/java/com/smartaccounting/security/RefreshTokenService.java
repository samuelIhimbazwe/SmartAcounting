package com.smartaccounting.security;

import com.smartaccounting.entity.RefreshToken;
import com.smartaccounting.repository.RefreshTokenRepository;
import com.smartaccounting.signup.PublicAuthSqlLookup;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PublicAuthSqlLookup authLookup;
    private final boolean postgresDefinerLookup;
    private final long expirationDays;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                               JdbcTemplate jdbcTemplate,
                               PublicAuthSqlLookup authLookup,
                               @Value("${smartaccounting.security.refresh-expiration-days:14}") long expirationDays) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.authLookup = authLookup;
        this.postgresDefinerLookup = isPostgres(jdbcTemplate.getDataSource());
        this.expirationDays = expirationDays;
    }

    @Transactional
    public String issue(String tenantId, String userId, UserDetails userDetails) {
        String rawToken = UUID.randomUUID() + "." + UUID.randomUUID();
        RefreshToken token = new RefreshToken();
        token.setId(UUID.randomUUID());
        token.setTenantId(UUID.fromString(tenantId));
        token.setUserId(UUID.fromString(userId));
        token.setUsername(userDetails.getUsername());
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(Instant.now().plusSeconds(expirationDays * 24 * 60 * 60));
        token.setRevoked(false);
        token.setCreatedAt(Instant.now());
        refreshTokenRepository.save(token);
        return rawToken;
    }

    @Transactional
    public RefreshToken consume(String rawToken) {
        String tokenHash = hash(rawToken);
        TenantUser subject = lookupSubject(tokenHash)
            .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        TenantContext.set(subject.tenantId(), subject.userId());
        try {
            Instant now = Instant.now();
            int updated = refreshTokenRepository.consumeAtomic(tokenHash, now, now);
            if (updated != 1) {
                throw new IllegalArgumentException("Invalid refresh token");
            }
            return refreshTokenRepository.findAnyByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        } finally {
            TenantContext.clear();
        }
    }

    @Transactional
    public void revoke(String rawToken) {
        String tokenHash = hash(rawToken);
        Optional<TenantUser> subject = lookupSubject(tokenHash);
        if (subject.isEmpty()) {
            return;
        }
        TenantContext.set(subject.get().tenantId(), subject.get().userId());
        try {
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
                token.setRevoked(true);
                token.setUsed(true);
                token.setUsedAt(Instant.now());
                refreshTokenRepository.save(token);
            });
        } finally {
            TenantContext.clear();
        }
    }

    @Transactional
    public int revokeAllForUser(UUID tenantId, UUID userId) {
        return refreshTokenRepository.revokeAllActiveForUser(tenantId, userId, Instant.now());
    }

    @Transactional
    @Scheduled(cron = "0 0 4 * * *")
    public int cleanupExpiredAndUsed() {
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(7L * 24 * 60 * 60);
        return refreshTokenRepository.cleanup(now, cutoff);
    }

    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed hashing refresh token", e);
        }
    }

    private Optional<TenantUser> lookupSubject(String tokenHash) {
        if (postgresDefinerLookup) {
            return authLookup.findRefreshSubject(tokenHash)
                .map(row -> new TenantUser(row.tenantId(), row.userId()));
        }
        List<TenantUser> rows = jdbcTemplate.query(
            "select tenant_id, user_id from refresh_tokens where token_hash = ?",
            (rs, rowNum) -> new TenantUser(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class)),
            tokenHash
        );
        return rows.stream().findFirst();
    }

    private static boolean isPostgres(DataSource dataSource) {
        if (dataSource == null) {
            return false;
        }
        try (Connection c = dataSource.getConnection()) {
            DatabaseMetaData meta = c.getMetaData();
            if (meta == null) {
                return false;
            }
            String product = meta.getDatabaseProductName();
            return product != null && product.toLowerCase().contains("postgres");
        } catch (Exception ex) {
            return false;
        }
    }

    private record TenantUser(UUID tenantId, UUID userId) {
    }
}
