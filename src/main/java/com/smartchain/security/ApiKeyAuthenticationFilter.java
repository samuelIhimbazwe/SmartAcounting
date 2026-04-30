package com.smartchain.security;

import com.smartchain.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {
    public static final String API_KEY_HEADER = "X-API-Key";
    private final ServiceAccountApiKeyService service;

    public ApiKeyAuthenticationFilter(ServiceAccountApiKeyService service) {
        this.service = service;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }
        String rawKey = request.getHeader(API_KEY_HEADER);
        if (rawKey == null || rawKey.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        ServiceAccountApiKeyService.ValidatedKey validated = service.validate(rawKey)
            .orElseThrow(() -> new IllegalArgumentException("Invalid API key"));
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_SERVICE_ACCOUNT"));
        validated.scopes().forEach(scope -> authorities.add(new SimpleGrantedAuthority("PERM_" + scope)));

        TenantContext.set(validated.tenantId(), validated.serviceUserId());
        MDC.put("tenantId", validated.tenantId().toString());
        MDC.put("userId", validated.serviceUserId().toString());
        response.setHeader("X-Auth-Method", "api-key");
        var auth = new UsernamePasswordAuthenticationToken(validated.serviceAccountName(), null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
        filterChain.doFilter(request, response);
    }
}
