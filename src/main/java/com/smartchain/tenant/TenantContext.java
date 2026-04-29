package com.smartchain.tenant;

import java.util.UUID;

public final class TenantContext {
    private static final ThreadLocal<UUID> TENANT_ID = new ThreadLocal<>();
    private static final ThreadLocal<UUID> USER_ID = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void set(UUID tenantId, UUID userId) {
        TENANT_ID.set(tenantId);
        USER_ID.set(userId);
    }

    public static UUID tenantId() {
        return TENANT_ID.get();
    }

    public static UUID userId() {
        return USER_ID.get();
    }

    public static void clear() {
        TENANT_ID.remove();
        USER_ID.remove();
    }
}
