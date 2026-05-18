package com.smartaccounting.security;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtRevocationService {
    private static final String KEY_PREFIX = "jwt:revoked:";

    private final StringRedisTemplate redisTemplate;

    public JwtRevocationService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void revoke(String jti, Date expiresAt) {
        if (jti == null || jti.isBlank()) {
            return;
        }
        long ttlSeconds = Math.max(1, expiresAt.toInstant().getEpochSecond() - Instant.now().getEpochSecond());
        redisTemplate.opsForValue().set(KEY_PREFIX + jti, "1", Duration.ofSeconds(ttlSeconds));
    }

    public boolean isRevoked(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + jti));
        } catch (RuntimeException ex) {
            return false;
        }
    }
}
