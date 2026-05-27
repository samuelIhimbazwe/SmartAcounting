package com.smartaccounting.security;

import com.smartaccounting.config.PublicSignupProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Component
public class PublicApiRateLimitFilter extends OncePerRequestFilter {

    private final StringRedisTemplate redisTemplate;
    private final PublicSignupProperties signupProperties;

    public PublicApiRateLimitFilter(StringRedisTemplate redisTemplate, PublicSignupProperties signupProperties) {
        this.redisTemplate = redisTemplate;
        this.signupProperties = signupProperties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = null;
        long limit = 0;
        Duration window = Duration.ofHours(1);
        if ("/api/v1/public/signup".equals(uri)) {
            if (!signupProperties.isRateLimitEnabled()) {
                filterChain.doFilter(request, response);
                return;
            }
            key = "ratelimit:signup:" + clientIp(request);
            limit = signupProperties.getFilterMaxPerHour();
            window = Duration.ofHours(1);
        } else if ("/api/v1/ai/copilot/query".equals(uri)) {
            String tenant = request.getHeader(TenantContextFilter.TENANT_HEADER);
            if (tenant == null || tenant.isBlank()) {
                tenant = "anonymous";
            }
            key = "ratelimit:copilot:" + tenant;
            limit = 30;
            window = Duration.ofHours(1);
        }

        if (key != null) {
            long count = increment(key, window);
            if (count > limit) {
                RateLimitResponseWriter.writeTooManyRequests(
                    response,
                    "Rate limit exceeded for " + uri,
                    window.toSeconds()
                );
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private long increment(String key, Duration window) {
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, window);
            }
            return count == null ? 1L : count;
        } catch (RuntimeException ex) {
            // Redis unavailable — do not fail public signup/login paths (matches PublicRateLimitService).
            return 1L;
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
