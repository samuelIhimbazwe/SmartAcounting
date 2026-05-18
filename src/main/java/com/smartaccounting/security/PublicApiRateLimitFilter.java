package com.smartaccounting.security;

import com.smartaccounting.exception.RateLimitExceededException;
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

    public PublicApiRateLimitFilter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
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
            key = "ratelimit:signup:" + clientIp(request);
            limit = 3;
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
                response.setHeader("Retry-After", String.valueOf(window.toSeconds()));
                throw new RateLimitExceededException("Rate limit exceeded for " + uri);
            }
        }
        filterChain.doFilter(request, response);
    }

    private long increment(String key, Duration window) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, window);
        }
        return count == null ? 1L : count;
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
