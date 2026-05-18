package com.smartaccounting.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtRevocationServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOps;

    @Test
    void revokeStoresKeyWithTtl() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        JwtRevocationService service = new JwtRevocationService(redisTemplate);
        Date expires = new Date(System.currentTimeMillis() + 60_000);
        service.revoke("jti-1", expires);
        verify(valueOps).set(eq("jwt:revoked:jti-1"), eq("1"), any());
    }

    @Test
    void isRevokedReturnsTrueWhenKeyExists() {
        when(redisTemplate.hasKey("jwt:revoked:jti-2")).thenReturn(true);
        JwtRevocationService service = new JwtRevocationService(redisTemplate);
        assertTrue(service.isRevoked("jti-2"));
    }

    @Test
    void isRevokedReturnsFalseForBlankJti() {
        JwtRevocationService service = new JwtRevocationService(redisTemplate);
        assertFalse(service.isRevoked(""));
    }
}
