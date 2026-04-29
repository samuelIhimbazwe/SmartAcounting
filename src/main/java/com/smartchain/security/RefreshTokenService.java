package com.smartchain.security;

import com.smartchain.entity.RefreshToken;
import com.smartchain.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final long expirationDays;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                               @Value("${smartchain.security.refresh-expiration-days:14}") long expirationDays) {
        this.refreshTokenRepository = refreshTokenRepository;
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
        String hash = hash(rawToken);
        Instant now = Instant.now();
        int updated = refreshTokenRepository.consumeAtomic(hash, now, now);
        if (updated != 1) {
            throw new IllegalArgumentException("Invalid refresh token");
        }
        return refreshTokenRepository.findAnyByTokenHash(hash)
            .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
    }

    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            token.setRevoked(true);
            token.setUsed(true);
            token.setUsedAt(Instant.now());
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    @Scheduled(cron = "0 4 * * *")
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
}
