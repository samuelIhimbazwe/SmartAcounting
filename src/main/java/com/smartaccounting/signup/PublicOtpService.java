package com.smartaccounting.signup;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PublicOtpService {
    private static final SecureRandom RNG = new SecureRandom();

    private final StringRedisTemplate redisTemplate;
    private final Duration otpTtl;
    private final Duration lockTtl;
    private final int maxAttemptsBeforeLock;

    private final ConcurrentHashMap<String, LocalOtp> localStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, LocalFail> localFails = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> localLocks = new ConcurrentHashMap<>();

    public PublicOtpService(StringRedisTemplate redisTemplate,
                            @Value("${smartaccounting.public-signup.otp-ttl-minutes:10}") int otpTtlMinutes,
                            @Value("${smartaccounting.public-signup.lock-minutes:30}") int lockMinutes,
                            @Value("${smartaccounting.public-signup.otp-max-failures:5}") int maxFailures) {
        this.redisTemplate = redisTemplate;
        this.otpTtl = Duration.ofMinutes(Math.max(1, otpTtlMinutes));
        this.lockTtl = Duration.ofMinutes(Math.max(1, lockMinutes));
        this.maxAttemptsBeforeLock = Math.max(1, maxFailures);
    }

    public String generateAndStore(String redisCodeKeyPrefix, String phone) {
        String code = String.format("%06d", RNG.nextInt(1_000_000));
        String key = redisCodeKeyPrefix + phone;
        try {
            redisTemplate.opsForValue().set(key, code, otpTtl);
        } catch (RuntimeException ex) {
            localStore.put(key, new LocalOtp(code, System.currentTimeMillis() + otpTtl.toMillis()));
        }
        return code;
    }

    public void assertNotLocked(String lockKeyPrefix, String phone) {
        String lockKey = lockKeyPrefix + phone;
        try {
            String v = redisTemplate.opsForValue().get(lockKey);
            if (v != null && !v.isBlank()) {
                throw new IllegalArgumentException("Too many attempts. Try again later.");
            }
        } catch (RuntimeException ex) {
            Long until = localLocks.get(lockKey);
            if (until != null && System.currentTimeMillis() < until) {
                throw new IllegalArgumentException("Too many attempts. Try again later.");
            }
        }
    }

    /**
     * @return true if OTP matches and consumed
     */
    public boolean verifyAndConsume(String redisCodeKeyPrefix, String lockKeyPrefix, String failKeyPrefix, String phone, String otp) {
        assertNotLocked(lockKeyPrefix, phone);
        String key = redisCodeKeyPrefix + phone;
        String expected = getCode(key);
        if (expected == null) {
            recordFailure(lockKeyPrefix, failKeyPrefix, phone);
            return false;
        }
        if (!expected.equals(trimOtp(otp))) {
            recordFailure(lockKeyPrefix, failKeyPrefix, phone);
            return false;
        }
        clearSuccess(key, failKeyPrefix + phone);
        return true;
    }

    private String trimOtp(String otp) {
        return otp == null ? "" : otp.trim();
    }

    private String getCode(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (RuntimeException ex) {
            LocalOtp o = localStore.get(key);
            if (o == null || System.currentTimeMillis() > o.expiresAtMs) {
                localStore.remove(key);
                return null;
            }
            return o.code;
        }
    }

    private void clearSuccess(String codeKey, String failKey) {
        try {
            redisTemplate.delete(codeKey);
            redisTemplate.delete(failKey);
        } catch (RuntimeException ex) {
            localStore.remove(codeKey);
            localFails.remove(failKey);
        }
    }

    private void recordFailure(String lockKeyPrefix, String failKeyPrefix, String phone) {
        String failKey = failKeyPrefix + phone;
        String lockKey = lockKeyPrefix + phone;
        try {
            Long n = redisTemplate.opsForValue().increment(failKey);
            if (n != null && n == 1L) {
                redisTemplate.expire(failKey, otpTtl);
            }
            if (n != null && n >= maxAttemptsBeforeLock) {
                redisTemplate.opsForValue().set(lockKey, "1", lockTtl);
                redisTemplate.delete(failKey);
            }
        } catch (RuntimeException ex) {
            LocalFail f = localFails.compute(failKey, (k, existing) ->
                existing == null ? new LocalFail(1, System.currentTimeMillis() + otpTtl.toMillis())
                    : new LocalFail(existing.count + 1, existing.expiresAtMs));
            if (f.count >= maxAttemptsBeforeLock) {
                localLocks.put(lockKey, System.currentTimeMillis() + lockTtl.toMillis());
                localFails.remove(failKey);
            }
        }
    }

    private record LocalOtp(String code, long expiresAtMs) {
    }

    private record LocalFail(int count, long expiresAtMs) {
    }
}
