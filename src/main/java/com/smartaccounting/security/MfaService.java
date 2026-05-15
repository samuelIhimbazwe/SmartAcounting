package com.smartaccounting.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import com.smartaccounting.signup.SelfServiceUserLookup;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class MfaService {
    private static final SecureRandom RNG = new SecureRandom();
    private static final Set<String> PRIVILEGED_ROLES = Set.of("ROLE_CEO", "ROLE_CFO");

    private final StringRedisTemplate redisTemplate;
    private final SelfServiceUserLookup selfServiceUserLookup;
    private final long challengeTtlSeconds;
    private final boolean debugReturnCode;
    private final Map<String, LocalChallenge> localChallengeStore = new ConcurrentHashMap<>();

    public MfaService(StringRedisTemplate redisTemplate,
                      SelfServiceUserLookup selfServiceUserLookup,
                      @Value("${smartaccounting.security.mfa.challenge-ttl-seconds:300}") long challengeTtlSeconds,
                      @Value("${smartaccounting.security.mfa.debug-return-code:false}") boolean debugReturnCode) {
        this.redisTemplate = redisTemplate;
        this.selfServiceUserLookup = selfServiceUserLookup;
        this.challengeTtlSeconds = challengeTtlSeconds;
        this.debugReturnCode = debugReturnCode;
    }

    public boolean requiresSecondFactor(UserDetails userDetails) {
        String username = userDetails.getUsername();
        if (!selfServiceUserLookup.hasPasswordBackedUser(username)) {
            return false;
        }
        if (selfServiceUserLookup.isSelfServiceOwner(username)) {
            return false;
        }
        Set<String> authorities = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toSet());
        return authorities.stream().anyMatch(PRIVILEGED_ROLES::contains);
    }

    public Challenge issueChallenge(String username, String tenantId, String userId) {
        String code = String.format("%06d", RNG.nextInt(1_000_000));
        String challengeId = UUID.randomUUID().toString();
        String key = challengeKey(username, tenantId, userId, challengeId);
        try {
            redisTemplate.opsForValue().set(key, code, Duration.ofSeconds(challengeTtlSeconds));
        } catch (RedisConnectionFailureException ex) {
            localChallengeStore.put(key, new LocalChallenge(code, Instant.now().plusSeconds(challengeTtlSeconds)));
        } catch (RuntimeException ex) {
            localChallengeStore.put(key, new LocalChallenge(code, Instant.now().plusSeconds(challengeTtlSeconds)));
        }
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
        String expected = resolveExpectedCode(key);
        if (expected == null) {
            throw new IllegalArgumentException("MFA challenge expired or not found");
        }
        if (!expected.equals(otpCode)) {
            throw new IllegalArgumentException("Invalid OTP code");
        }
        try {
            redisTemplate.delete(key);
        } catch (RuntimeException ex) {
            localChallengeStore.remove(key);
        }
    }

    private String resolveExpectedCode(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (RedisConnectionFailureException ex) {
            return resolveLocalCode(key);
        } catch (RuntimeException ex) {
            return resolveLocalCode(key);
        }
    }

    private String resolveLocalCode(String key) {
        LocalChallenge challenge = localChallengeStore.get(key);
        if (challenge == null) {
            return null;
        }
        if (Instant.now().isAfter(challenge.expiresAt())) {
            localChallengeStore.remove(key);
            return null;
        }
        return challenge.code();
    }

    private String challengeKey(String username, String tenantId, String userId, String challengeId) {
        return "mfa:challenge:" + tenantId + ":" + userId + ":" + username + ":" + challengeId;
    }

    public record Challenge(String challengeId, long expiresInSeconds, String debugCode) {
    }

    private record LocalChallenge(String code, Instant expiresAt) {
    }
}
