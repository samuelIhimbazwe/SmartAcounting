package com.smartchain.security;

import com.smartchain.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class TenantContextFilter extends OncePerRequestFilter {

    public static final String TENANT_HEADER = "X-Tenant-Id";
    public static final String USER_HEADER = "X-User-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String tenant = request.getHeader(TENANT_HEADER);
            String user = request.getHeader(USER_HEADER);
            if (tenant != null && user != null) {
                TenantContext.set(UUID.fromString(tenant), UUID.fromString(user));
                MDC.put("tenantId", tenant);
                MDC.put("userId", user);
            }
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("tenantId");
            MDC.remove("userId");
            TenantContext.clear();
        }
    }
}
