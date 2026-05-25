package com.smartaccounting.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private final StringRedisTemplate redisTemplate;
    private final ConcurrentHashMap<String, LocalWindowCounter> localCounters = new ConcurrentHashMap<>();

    public AuthRateLimitFilter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!isProtectedAuthEndpoint(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String tenant = request.getHeader(TenantContextFilter.TENANT_HEADER);
        String ip = clientIp(request);
        String endpoint = classifyEndpoint(request.getRequestURI());
        String key = "ratelimit:auth:" + endpoint + ":" + (tenant == null ? "anonymous" : tenant) + ":" + ip;
        long count = incrementCounter(key);

        long limit = switch (endpoint) {
            case "login" -> 5L;
            case "mfa_challenge" -> 10L;
            default -> 30L;
        };
        if (count > limit) {
            long retrySeconds = "login".equals(endpoint) ? 900L : 60L;
            RateLimitResponseWriter.writeTooManyRequests(
                response,
                "Too many auth attempts. Try again later.",
                retrySeconds
            );
            return;
        }
        filterChain.doFilter(request, response);
    }

    private long incrementCounter(String key) {
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                Duration ttl = key.contains(":login:") ? Duration.ofMinutes(15) : Duration.ofMinutes(1);
                redisTemplate.expire(key, ttl);
            }
            return count == null ? 1L : count;
        } catch (RedisConnectionFailureException ex) {
            return incrementLocalCounter(key);
        } catch (RuntimeException ex) {
            return incrementLocalCounter(key);
        }
    }

    private long incrementLocalCounter(String key) {
        Instant now = Instant.now();
        LocalWindowCounter counter = localCounters.compute(key, (k, existing) -> {
            if (existing == null || now.isAfter(existing.expiresAt())) {
                return new LocalWindowCounter(new AtomicLong(1), now.plusSeconds(60));
            }
            existing.count().incrementAndGet();
            return existing;
        });
        return counter.count().get();
    }

    private boolean isProtectedAuthEndpoint(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return false;
        String uri = request.getRequestURI();
        return "/api/v1/auth/login".equals(uri)
            || "/api/v1/auth/oauth-login".equals(uri)
            || "/api/v1/auth/refresh".equals(uri)
            || "/api/v1/auth/mfa/challenge".equals(uri);
    }

    private String classifyEndpoint(String uri) {
        if (uri.endsWith("/login") || uri.endsWith("/oauth-login")) return "login";
        if (uri.endsWith("/mfa/challenge")) return "mfa_challenge";
        return "refresh";
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private record LocalWindowCounter(AtomicLong count, Instant expiresAt) {
    }
}
