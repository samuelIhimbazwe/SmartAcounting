package com.smartaccounting.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", "Validation failed"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", ex.getMessage()));
    }

    /**
     * Wrong password and other auth failures use {@link AuthenticationException}; map to 401 — otherwise they hit
     * {@link #handleGeneric(Exception)} and clients see misleading HTTP 500.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuthenticationException(AuthenticationException ex) {
        if (ex instanceof InternalAuthenticationServiceException) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "Authentication service error"));
        }
        String msg = ex.getMessage();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", msg != null && !msg.isBlank() ? msg : "Invalid credentials"));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<Map<String, String>> handleRateLimit(RateLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<Map<String, String>> handleIdempotencyConflict(IdempotencyConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(CreditLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleCreditLimitExceeded(CreditLimitExceededException ex) {
        return ResponseEntity.unprocessableEntity().body(Map.of(
            "error", "CREDIT_LIMIT_EXCEEDED",
            "currentBalance", ex.getCurrentBalance(),
            "creditLimit", ex.getCreditLimit(),
            "availableCredit", ex.getAvailableCredit()
        ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access Denied"));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, String>> handleConflict(ConflictException ex) {
        String message = ex.getMessage();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
            "error",
            message != null && !message.isBlank() ? message : "Conflict"
        ));
    }

    @ExceptionHandler(RoleConflictException.class)
    public ResponseEntity<Map<String, String>> handleRoleConflict(RoleConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(RoleModificationException.class)
    public ResponseEntity<Map<String, String>> handleRoleModification(RoleModificationException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", ex.getMessage()));
    }
}
