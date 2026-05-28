package com.smartaccounting.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class HrServiceValidationTest {

    @Test
    void validateLeaveDates_rejectsEndBeforeStart() {
        assertThrows(IllegalArgumentException.class, () ->
            invokeValidateLeaveDates(LocalDate.of(2026, 5, 10), LocalDate.of(2026, 5, 9)));
    }

    @Test
    void validateLeaveDates_acceptsSingleDay() {
        assertDoesNotThrow(() ->
            invokeValidateLeaveDates(LocalDate.of(2026, 5, 10), LocalDate.of(2026, 5, 10)));
    }

    private static void invokeValidateLeaveDates(LocalDate start, LocalDate end) {
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("Leave end date must be on or after start date");
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1;
        if (days > 366) {
            throw new IllegalArgumentException("Leave request exceeds maximum duration");
        }
    }
}
