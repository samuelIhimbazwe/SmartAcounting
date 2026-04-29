package com.smartchain.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MfaService {
    private static final SecureRandom RNG = new SecureRandom();
    private static final Set<String> PRIVILEGED_ROLES = Set.of("ROLE_CEO", "ROLE_CFO");

    private final StringRedisTemplate redisTemplate;
    private final long challengeTtlSeconds;
    private final boolean debugReturnCode;

    public MfaService(StringRedisTemplate redisTemplate,
                      @Value("${smartchain.security.mfa.challenge-ttl-seconds:300}") long challengeTtlSeconds,
                      @Value("${smartchain.security.mfa.debug-return-code:false}") boolean debugReturnCode) {
        this.redisTemplate = redisTemplate;
        this.challengeTtlSeconds = challengeTtlSeconds;
        this.debugReturnCode = debugReturnCode;
    }

    public boolean requiresSecondFactor(UserDetails userDetails) {
        Set<String> authorities = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toSet());
        return authorities.stream().anyMatch(PRIVILEGED_ROLES::contains);
    }

    public Challenge issueChallenge(String username, String tenantId, String userId) {
        String code = String.format("%06d", RNG.nextInt(1_000_000));
        String challengeId = UUID.randomUUID().toString();
        String key = challengeKey(username, tenantId, userId, challengeId);
        redisTemplate.opsForValue().set(key, code, Duration.ofSeconds(challengeTtlSeconds));
        return new Challenge(challengeId, challengeTtlSeconds, debugReturnCode ? code : null);
    }

    public void assertValidOtp(String username, String tenantId, String userId, String challengeId, String otpCode) {
        if (challengeId == null || challengeId.isBlank()) {
            throw new IllegalArgumentException("mfaChallengeId is required for privileged roles");
        }
        if (otpCode == null || otpCode.isBlank()) {
            throw new IllegalArgumentException("otpCode is required for privileged roles");
        }
        String key = challengeKey(username, tenantId, userId, challengeId);
        String expected = redisTemplate.opsForValue().get(key);
        if (expected == null) {
            throw new IllegalArgumentException("MFA challenge expired or not found");
        }
        if (!expected.equals(otpCode)) {
            throw new IllegalArgumentException("Invalid OTP code");
        }
        redisTemplate.delete(key);
    }

    private String challengeKey(String username, String tenantId, String userId, String challengeId) {
        return "mfa:challenge:" + tenantId + ":" + userId + ":" + username + ":" + challengeId;
    }

    public record Challenge(String challengeId, long expiresInSeconds, String debugCode) {
    }
}
