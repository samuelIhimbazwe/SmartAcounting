package com.smartaccounting.dashboard;

import com.smartaccounting.dto.KpiDto;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;

@Service
public class DashboardCacheService {
    private final RedisTemplate<String, Object> redisTemplate;

    public DashboardCacheService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Optional<List<KpiDto>> getKpis(UUID tenantId, String role, String dateRange) {
        try {
            Object v = redisTemplate.opsForValue().get(kpiKey(tenantId, role, dateRange));
            if (v instanceof List<?>) {
                @SuppressWarnings("unchecked")
                List<KpiDto> cast = (List<KpiDto>) v;
                return Optional.of(cast);
            }
        } catch (RuntimeException ex) {
            return Optional.empty();
        }
        return Optional.empty();
    }

    public void setKpis(UUID tenantId, String role, String dateRange, List<KpiDto> data) {
        try {
            redisTemplate.opsForValue().set(kpiKey(tenantId, role, dateRange), data, Duration.ofSeconds(60));
        } catch (RuntimeException ignored) {
            // Cache unavailable; keep request path functional.
        }
    }

    public void invalidate(UUID tenantId, String role) {
        try {
            Set<String> keys = redisTemplate.keys("smartaccounting:" + tenantId + ":" + role + ":kpis:*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (RuntimeException ignored) {
            // Cache unavailable; nothing to invalidate.
        }
    }

    public void invalidateAllRoles(UUID tenantId) {
        for (String role : List.of("ceo", "cfo", "sales", "operations", "hr", "marketing", "accounting")) {
            invalidate(tenantId, role);
        }
    }

    public Map<String, Object> stats() {
        try {
            Properties info = redisTemplate.getRequiredConnectionFactory().getConnection().serverCommands().info("memory");
            Long count = redisTemplate.execute((RedisCallback<Long>) conn -> conn.serverCommands().dbSize());
            return Map.of(
                "estimatedKeyCount", count == null ? 0L : count,
                "usedMemory", info == null ? "unknown" : String.valueOf(info.getProperty("used_memory_human", "unknown"))
            );
        } catch (RuntimeException ex) {
            return Map.of(
                "estimatedKeyCount", 0L,
                "usedMemory", "unavailable"
            );
        }
    }

    public String kpiKey(UUID tenantId, String role, String dateRange) {
        return "smartaccounting:" + tenantId + ":" + role + ":kpis:" + Integer.toHexString(Objects.hash(dateRange));
    }
}
