package com.smartaccounting.service;

import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * HQ dashboard aggregates. {@code scope=all} returns cross-location totals;
 * otherwise scoped to {@link LocationService#resolveContextLocationId()}.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsDashboardService {
    private final LocationService locationService;

    public AnalyticsDashboardService(LocationService locationService) {
        this.locationService = locationService;
    }

    public Map<String, Object> dashboard(String scope) {
        UUID tenantId = TenantContext.tenantId();
        if ("all".equalsIgnoreCase(scope)) {
            return hqAllBranches(tenantId);
        }
        UUID locationId = locationService.resolveContextLocationId();
        return singleBranch(tenantId, locationId);
    }

    private Map<String, Object> hqAllBranches(UUID tenantId) {
        // TODO: replace with SQL aggregates across sales_orders / inventory per location
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("scope", "all");
        m.put("totalSalesToday", BigDecimal.valueOf(0));
        m.put("totalVoidsToday", 0);
        m.put("openTills", 0);
        m.put("cashierCount", 0);
        m.put("locations", List.of(
            Map.of(
                "locationId", UUID.randomUUID(),
                "name", "Main shop",
                "salesToday", BigDecimal.ZERO,
                "voids", 0,
                "openTills", 0
            )
        ));
        m.put("stockAlerts", List.of());
        m.put("topProducts", List.of());
        m.put("_note", "Mock shape — wire to sales/inventory aggregates in a follow-up");
        return m;
    }

    private Map<String, Object> singleBranch(UUID tenantId, UUID locationId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("scope", "location");
        m.put("locationId", locationId);
        m.put("totalSalesToday", BigDecimal.ZERO);
        m.put("openTills", 0);
        return m;
    }
}
