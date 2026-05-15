package com.smartaccounting.signup;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PublicRateLimitService {
    private final StringRedisTemplate redisTemplate;
    private final ConcurrentHashMap<String, LocalCounter> localWindows = new ConcurrentHashMap<>();

    public PublicRateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * @return true if under limit (request allowed), false if rate limited
     */
    public boolean allow(String redisKey, long maxRequests, Duration window) {
        try {
            Long n = redisTemplate.opsForValue().increment(redisKey);
            if (n != null && n == 1L) {
                redisTemplate.expire(redisKey, window);
            }
            return n != null && n <= maxRequests;
        } catch (RuntimeException ex) {
            return allowLocal(redisKey, maxRequests, window);
        }
    }

    private boolean allowLocal(String key, long maxRequests, Duration window) {
        long windowMs = window.toMillis();
        long now = System.currentTimeMillis();
        LocalCounter c = localWindows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStartMs > windowMs) {
                return new LocalCounter(now, new AtomicLong(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });
        return c.count.get() <= maxRequests;
    }

    private record LocalCounter(long windowStartMs, AtomicLong count) {
    }
}
