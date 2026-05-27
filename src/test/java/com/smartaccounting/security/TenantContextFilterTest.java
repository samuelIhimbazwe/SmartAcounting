package com.smartaccounting.security;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class TenantContextFilterTest {

    @Test
    void parseUuidHeader_acceptsValidUuid() {
        UUID id = UUID.randomUUID();
        assertEquals(id, TenantContextFilter.parseUuidHeader(id.toString()));
    }

    @Test
    void parseUuidHeader_rejectsDemoPlaceholder() {
        assertNull(TenantContextFilter.parseUuidHeader("public"));
    }

    @Test
    void parseUuidHeader_rejectsBlank() {
        assertNull(TenantContextFilter.parseUuidHeader("  "));
        assertNull(TenantContextFilter.parseUuidHeader(null));
    }
}
