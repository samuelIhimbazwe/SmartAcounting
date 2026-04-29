package com.smartchain.dashboard;

import com.smartchain.dto.KpiDto;
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
        Object v = redisTemplate.opsForValue().get(kpiKey(tenantId, role, dateRange));
        if (v instanceof List<?>) {
            @SuppressWarnings("unchecked")
            List<KpiDto> cast = (List<KpiDto>) v;
            return Optional.of(cast);
        }
        return Optional.empty();
    }

    public void setKpis(UUID tenantId, String role, String dateRange, List<KpiDto> data) {
        redisTemplate.opsForValue().set(kpiKey(tenantId, role, dateRange), data, Duration.ofSeconds(60));
    }

    public void invalidate(UUID tenantId, String role) {
        Set<String> keys = redisTemplate.keys("smartchain:" + tenantId + ":" + role + ":kpis:*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }

    public void invalidateAllRoles(UUID tenantId) {
        for (String role : List.of("ceo", "cfo", "sales", "operations", "hr", "marketing", "accounting")) {
            invalidate(tenantId, role);
        }
    }

    public Map<String, Object> stats() {
        Properties info = redisTemplate.getRequiredConnectionFactory().getConnection().serverCommands().info("memory");
        Long count = redisTemplate.execute(conn -> conn.serverCommands().dbSize());
        return Map.of(
            "estimatedKeyCount", count == null ? 0L : count,
            "usedMemory", info == null ? "unknown" : String.valueOf(info.getProperty("used_memory_human", "unknown"))
        );
    }

    public String kpiKey(UUID tenantId, String role, String dateRange) {
        return "smartchain:" + tenantId + ":" + role + ":kpis:" + Integer.toHexString(Objects.hash(dateRange));
    }
}
