package com.smartaccounting.security;

import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("userRoleAccessGuard")
public class UserRoleAccessGuard {

    public boolean isSelf(UUID userId) {
        UUID currentUserId = TenantContext.userId();
        return currentUserId != null && currentUserId.equals(userId);
    }
}
