package com.smartchain.security;

import com.smartchain.exception.RateLimitExceededException;
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
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private final StringRedisTemplate redisTemplate;

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
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, Duration.ofMinutes(1));
        }

        long limit = switch (endpoint) {
            case "login" -> 12L;
            case "mfa_challenge" -> 10L;
            default -> 30L;
        };
        if (count != null && count > limit) {
            response.setHeader("Retry-After", "60");
            throw new RateLimitExceededException("Too many auth attempts. Try again later.");
        }
        filterChain.doFilter(request, response);
    }

    private boolean isProtectedAuthEndpoint(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return false;
        String uri = request.getRequestURI();
        return "/api/v1/auth/login".equals(uri)
            || "/api/v1/auth/refresh".equals(uri)
            || "/api/v1/auth/mfa/challenge".equals(uri);
    }

    private String classifyEndpoint(String uri) {
        if (uri.endsWith("/login")) return "login";
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
}
