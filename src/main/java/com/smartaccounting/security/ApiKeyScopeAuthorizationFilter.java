package com.smartaccounting.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Enforces service-account API key scopes. Keys with no scopes retain full API access.
 */
@Component
public class ApiKeyScopeAuthorizationFilter extends OncePerRequestFilter {

  private static final Set<String> FINANCE_PREFIXES = Set.of(
      "/api/v1/finance/payroll",
      "/api/v1/hr/payroll"
  );

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || auth.getAuthorities() == null) {
      filterChain.doFilter(request, response);
      return;
    }
    boolean serviceAccount = auth.getAuthorities().stream()
        .anyMatch(a -> "ROLE_SERVICE_ACCOUNT".equals(a.getAuthority()));
    if (!serviceAccount) {
      filterChain.doFilter(request, response);
      return;
    }

    Set<String> scopes = auth.getAuthorities().stream()
        .map(GrantedAuthority::getAuthority)
        .filter(a -> a.startsWith("PERM_"))
        .map(a -> a.substring("PERM_".length()))
        .collect(Collectors.toSet());

    if (scopes.isEmpty() || scopes.contains("ADMIN")) {
      filterChain.doFilter(request, response);
      return;
    }

    String path = request.getRequestURI();
    if (path.startsWith("/api/v1/finance") || path.startsWith("/api/v1/hr/payroll")) {
      if (!scopes.contains("FINANCE") && !scopes.contains("HR")) {
        response.sendError(HttpServletResponse.SC_FORBIDDEN, "API key scope does not allow finance endpoints");
        return;
      }
    }
    if (path.startsWith("/api/v1/pos") && !scopes.contains("POS")) {
      response.sendError(HttpServletResponse.SC_FORBIDDEN, "API key scope does not allow POS endpoints");
      return;
    }
  filterChain.doFilter(request, response);
  }
}
