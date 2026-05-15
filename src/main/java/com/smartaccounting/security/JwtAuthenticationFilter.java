package com.smartaccounting.security;

import com.smartaccounting.tenant.TenantContext;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = resolveBearerOrQueryToken(request);
        if (token != null && !token.isEmpty()) {
            try {
                Claims claims = jwtService.parse(token);
                String username = claims.getSubject();
                String tenantId = claims.get("tenantId", String.class);
                String userId = claims.get("userId", String.class);
                List<GrantedAuthority> authorities = authoritiesFromRolesClaim(claims.get("roles"));

                var auth = new UsernamePasswordAuthenticationToken(
                    username,
                    null,
                    authorities
                );
                SecurityContextHolder.getContext().setAuthentication(auth);

                if (tenantId != null && userId != null) {
                    TenantContext.set(UUID.fromString(tenantId), UUID.fromString(userId));
                }
            } catch (JwtException | IllegalArgumentException ex) {
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Authorization header for normal API calls; {@code ?token=} for GET-only APIs such as {@code EventSource} (no custom headers).
     */
    private static String resolveBearerOrQueryToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String bearer = header.substring(7).trim();
            if (!bearer.isEmpty()) {
                return bearer;
            }
        }
        if ("GET".equalsIgnoreCase(request.getMethod())) {
            String q = request.getParameter("token");
            if (q != null && !q.isBlank()) {
                return q.trim();
            }
        }
        return null;
    }

    /**
     * JJWT / JSON may expose {@code roles} as {@code List<String>}, {@code List<Map>}, a single string, or null.
     * Empty authorities would still satisfy {@code authenticated()} but fail {@code @PreAuthorize} (HTTP 403).
     */
    private static List<GrantedAuthority> authoritiesFromRolesClaim(Object raw) {
        if (raw == null) {
            return Collections.emptyList();
        }
        if (raw instanceof String s) {
            if (!StringUtils.hasText(s)) {
                return Collections.emptyList();
            }
            return List.of(new SimpleGrantedAuthority(s.trim()));
        }
        if (raw instanceof Collection<?> coll) {
            List<GrantedAuthority> out = new ArrayList<>();
            for (Object item : coll) {
                if (item == null) {
                    continue;
                }
                if (item instanceof String str && StringUtils.hasText(str)) {
                    out.add(new SimpleGrantedAuthority(str.trim()));
                } else if (item instanceof Map<?, ?> map) {
                    Object authority = map.get("authority");
                    if (authority != null && StringUtils.hasText(authority.toString())) {
                        out.add(new SimpleGrantedAuthority(authority.toString().trim()));
                    }
                }
            }
            return out;
        }
        return Collections.emptyList();
    }
}
