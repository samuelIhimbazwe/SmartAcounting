package com.smartaccounting.dto;

/**
 * TIN validation result for POS / compliance clients.
 * {@code registered} mirrors {@code valid} for backward-compatible clients.
 */
public record TinValidationResponse(
    boolean valid,
    String name,
    Boolean registered,
    String error
) {
    public static TinValidationResponse ok(String name) {
        return new TinValidationResponse(true, name, true, null);
    }

    public static TinValidationResponse fail(String error) {
        return new TinValidationResponse(false, null, false, error);
    }

    public static TinValidationResponse permissiveOk() {
        return ok(null);
    }
}
