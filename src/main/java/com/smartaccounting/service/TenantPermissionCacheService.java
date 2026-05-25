package com.smartaccounting.service;

import com.smartaccounting.repository.UserRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class TenantPermissionCacheService {
    private static final Logger log = LoggerFactory.getLogger(TenantPermissionCacheService.class);
    private static final Duration TTL = Duration.ofMinutes(5);

    private final RedisTemplate<String, Object> redisTemplate;
    private final UserRoleRepository userRoleRepository;

    public TenantPermissionCacheService(
        RedisTemplate<String, Object> redisTemplate,
        UserRoleRepository userRoleRepository
    ) {
        this.redisTemplate = redisTemplate;
        this.userRoleRepository = userRoleRepository;
    }

    public Set<String> getPermissions(UUID tenantId, UUID userId) {
        if (tenantId == null || userId == null) {
            return null;
        }
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey(tenantId, userId));
            return deserializePermissionSet(cached);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    public void putPermissions(UUID tenantId, UUID userId, Set<String> codes) {
        if (tenantId == null || userId == null || codes == null) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(cacheKey(tenantId, userId), codes, TTL);
        } catch (RuntimeException ignored) {
            // Cache unavailable; keep authorization path functional.
        }
    }

    public void invalidateUser(UUID tenantId, UUID userId) {
        if (tenantId == null || userId == null) {
            return;
        }
        try {
            redisTemplate.delete(cacheKey(tenantId, userId));
        } catch (RuntimeException ignored) {
            // Cache unavailable.
        }
    }

    public void invalidateTenant(UUID tenantId) {
        if (tenantId == null) {
            return;
        }
        try {
            Set<String> keys = redisTemplate.keys("smartaccounting:rbac:" + tenantId + ":*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (RuntimeException ignored) {
            // Cache unavailable; keep onboarding path functional.
        }
    }

    /** Invalidate all users assigned to a role after its permission set changes. */
    public void invalidateRole(UUID tenantId, String roleName) {
        if (tenantId == null || roleName == null || roleName.isBlank()) {
            return;
        }
        List<UUID> userIds = userRoleRepository.findUserIdsByTenantIdAndRoleName(tenantId, roleName);
        for (UUID userId : userIds) {
            invalidateUser(tenantId, userId);
        }
        log.info(
            "RBAC cache invalidated for {} users with role {} in tenant {}",
            userIds.size(),
            roleName,
            tenantId
        );
    }

    private static String cacheKey(UUID tenantId, UUID userId) {
        return "smartaccounting:rbac:" + tenantId + ":user:" + userId + ":perms";
    }

    @SuppressWarnings("unchecked")
    private static Set<String> deserializePermissionSet(Object cached) {
        if (cached == null) {
            return null;
        }
        if (cached instanceof Set<?> set) {
            Set<String> codes = new HashSet<>();
            for (Object item : set) {
                if (item != null) {
                    codes.add(String.valueOf(item));
                }
            }
            return codes;
        }
        if (cached instanceof Collection<?> collection) {
            Set<String> codes = new HashSet<>();
            for (Object item : collection) {
                if (item != null) {
                    codes.add(String.valueOf(item));
                }
            }
            return codes;
        }
        return null;
    }
}
