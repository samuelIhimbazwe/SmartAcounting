package com.smartaccounting.tenant;

import java.util.UUID;

public final class LocationContext {
    private static final ThreadLocal<UUID> LOCATION_ID = new ThreadLocal<>();

    private LocationContext() {
    }

    public static void set(UUID locationId) {
        LOCATION_ID.set(locationId);
    }

    public static UUID locationId() {
        return LOCATION_ID.get();
    }

    public static void clear() {
        LOCATION_ID.remove();
    }
}
