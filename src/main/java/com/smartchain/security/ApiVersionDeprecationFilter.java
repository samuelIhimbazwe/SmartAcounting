package com.smartchain.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class ApiVersionDeprecationFilter extends OncePerRequestFilter {
    private final boolean v1DeprecationEnabled;
    private final String v1Sunset;

    public ApiVersionDeprecationFilter(@Value("${smartchain.api.v1-deprecation-enabled:false}") boolean v1DeprecationEnabled,
                                       @Value("${smartchain.api.v1-sunset:Wed, 31 Dec 2026 23:59:59 GMT}") String v1Sunset) {
        this.v1DeprecationEnabled = v1DeprecationEnabled;
        this.v1Sunset = v1Sunset;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (request.getRequestURI().startsWith("/api/v1/")) {
            response.setHeader("X-API-Version", "v1");
            if (v1DeprecationEnabled) {
                response.setHeader("Deprecation", "true");
                response.setHeader("Sunset", v1Sunset);
                response.setHeader("Link", "</api/v2>; rel=\"successor-version\"");
            }
        }
        filterChain.doFilter(request, response);
    }
}
