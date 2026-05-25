package com.smartaccounting.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Writes JSON rate-limit responses from servlet filters.
 * {@code @RestControllerAdvice} does not handle exceptions thrown in filters.
 */
final class RateLimitResponseWriter {

    private RateLimitResponseWriter() {
    }

    static void writeTooManyRequests(HttpServletResponse response, String message, long retryAfterSeconds)
        throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        String safe = message == null ? "Too many requests" : message.replace("\\", "\\\\").replace("\"", "\\\"");
        response.getWriter().write("{\"error\":\"" + safe + "\"}");
    }
}
