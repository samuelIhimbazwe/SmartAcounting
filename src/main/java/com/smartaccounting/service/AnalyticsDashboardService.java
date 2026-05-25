package com.smartaccounting.service;

import com.smartaccounting.repository.AnalyticsDashboardJdbcRepository;
import com.smartaccounting.repository.AnalyticsDashboardJdbcRepository.ArApSnapshotRow;
import com.smartaccounting.repository.AnalyticsDashboardJdbcRepository.PayrollTotalsRow;
import com.smartaccounting.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
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
    private static final Logger log = LoggerFactory.getLogger(AnalyticsDashboardService.class);

    private final LocationService locationService;
    private final AnalyticsDashboardJdbcRepository analyticsRepository;

    public AnalyticsDashboardService(
        LocationService locationService,
        AnalyticsDashboardJdbcRepository analyticsRepository
    ) {
        this.locationService = locationService;
        this.analyticsRepository = analyticsRepository;
    }

    public Map<String, Object> dashboard(String scope) {
        UUID tenantId = TenantContext.tenantId();
        if ("all".equalsIgnoreCase(scope)) {
            Map<String, Object> m = new LinkedHashMap<>(coreMetrics(tenantId, null));
            m.put("scope", "all");
            m.put("locations", safeLocationBreakdown(tenantId));
            m.put("stockAlerts", safeLowStockAlerts(tenantId, null));
            m.put("topProducts", safeTopProducts(tenantId, null, 5));
            return m;
        }
        UUID locationId = locationService.resolveContextLocationId();
        Map<String, Object> m = new LinkedHashMap<>(coreMetrics(tenantId, locationId));
        m.put("scope", "location");
        m.put("locationId", locationId);
        m.put("stockAlerts", safeLowStockAlerts(tenantId, locationId));
        m.put("topProducts", safeTopProducts(tenantId, locationId, 5));
        return m;
    }

    private Map<String, Object> coreMetrics(UUID tenantId, UUID locationId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalSalesToday", safeSalesToday(tenantId, locationId));
        m.put("totalVoidsToday", safeVoidsToday(tenantId, locationId));
        m.put("openTills", safeOpenTills(tenantId, locationId));
        m.put("cashierCount", safeCashiersToday(tenantId, locationId));
        m.put("revenueByPeriod", revenueByPeriod(tenantId, locationId, 7));
        m.put("stockTurnover", stockTurnover(tenantId));
        m.put("payrollTotals", payrollTotals(tenantId));
        m.put("arApBalances", arApBalances(tenantId));
        return m;
    }

    /** Daily revenue for the last {@code days} calendar days (inclusive of today). */
    public List<Map<String, Object>> revenueByPeriod(UUID tenantId, UUID locationId, int days) {
        if (tenantId == null) {
            return List.of();
        }
        int window = Math.max(1, Math.min(days, 90));
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(window - 1L);
        try {
            List<Map<String, Object>> rows = analyticsRepository.revenueByDay(tenantId, locationId, start, end);
            Map<LocalDate, BigDecimal> byDay = new LinkedHashMap<>();
            for (Map<String, Object> row : rows) {
                LocalDate day = LocalDate.parse(row.get("date").toString());
                byDay.put(day, (BigDecimal) row.get("revenue"));
            }
            List<Map<String, Object>> filled = new ArrayList<>();
            for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("date", d.toString());
                row.put("revenue", byDay.getOrDefault(d, BigDecimal.ZERO));
                filled.add(row);
            }
            return filled;
        } catch (Exception ex) {
            log.warn("revenueByPeriod failed for tenant {}: {}", tenantId, ex.getMessage());
            return List.of();
        }
    }

    /** COGS (30d) divided by average on-hand quantity (stock_levels, else inventory_balances). */
    public BigDecimal stockTurnover(UUID tenantId) {
        if (tenantId == null) {
            return BigDecimal.ZERO;
        }
        try {
            BigDecimal cogs = analyticsRepository.cogsLast30Days(tenantId);
            BigDecimal avgInv = analyticsRepository.averageInventoryQuantity(tenantId);
            if (cogs == null || avgInv == null || avgInv.compareTo(BigDecimal.ZERO) == 0) {
                return BigDecimal.ZERO;
            }
            return cogs.divide(avgInv, 4, RoundingMode.HALF_UP);
        } catch (Exception ex) {
            log.warn("stockTurnover failed for tenant {}: {}", tenantId, ex.getMessage());
            return BigDecimal.ZERO;
        }
    }

    public Map<String, Object> payrollTotals(UUID tenantId) {
        String period = YearMonth.now().toString();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("period", period);
        m.put("totalGross", BigDecimal.ZERO);
        m.put("totalNet", BigDecimal.ZERO);
        m.put("totalPaye", BigDecimal.ZERO);
        m.put("employeeCount", 0);
        if (tenantId == null) {
            return m;
        }
        try {
            analyticsRepository.latestPayrollForPeriod(tenantId, period).ifPresent(row -> applyPayroll(m, row));
        } catch (Exception ex) {
            log.warn("payrollTotals failed for tenant {}: {}", tenantId, ex.getMessage());
        }
        return m;
    }

    public Map<String, Object> arApBalances(UUID tenantId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("accountsReceivable", BigDecimal.ZERO);
        m.put("accountsPayable", BigDecimal.ZERO);
        m.put("snapshotDate", LocalDate.now().toString());
        if (tenantId == null) {
            return m;
        }
        try {
            analyticsRepository.latestArApSnapshot(tenantId).ifPresent(row -> {
                m.put("accountsReceivable", row.arTotal());
                m.put("accountsPayable", row.apTotal());
                m.put("snapshotDate", row.snapshotDate().toString());
            });
            if (isZero((BigDecimal) m.get("accountsReceivable"))
                && isZero((BigDecimal) m.get("accountsPayable"))) {
                loadArApLive(tenantId, m);
            }
        } catch (Exception ex) {
            log.warn("arApBalances snapshot failed for tenant {}: {}", tenantId, ex.getMessage());
            loadArApLive(tenantId, m);
        }
        return m;
    }

    private void loadArApLive(UUID tenantId, Map<String, Object> m) {
        try {
            BigDecimal ar = analyticsRepository.sumOpenInvoices(tenantId);
            BigDecimal ap = analyticsRepository.sumOpenSupplierBills(tenantId);
            m.put("accountsReceivable", ar != null ? ar : BigDecimal.ZERO);
            m.put("accountsPayable", ap != null ? ap : BigDecimal.ZERO);
            m.put("snapshotDate", LocalDate.now().toString());
        } catch (Exception ex) {
            log.warn("arApBalances live fallback failed for tenant {}: {}", tenantId, ex.getMessage());
        }
    }

    private static void applyPayroll(Map<String, Object> m, PayrollTotalsRow row) {
        m.put("totalGross", row.gross());
        m.put("totalNet", row.net());
        m.put("totalPaye", row.paye());
        m.put("employeeCount", row.employees());
    }

    private static boolean isZero(BigDecimal value) {
        return value == null || value.compareTo(BigDecimal.ZERO) == 0;
    }

    private BigDecimal safeSalesToday(UUID tenantId, UUID locationId) {
        if (tenantId == null) {
            return BigDecimal.ZERO;
        }
        try {
            BigDecimal v = analyticsRepository.sumSalesToday(tenantId, locationId);
            return v != null ? v : BigDecimal.ZERO;
        } catch (Exception ex) {
            log.warn("salesToday failed for tenant {}: {}", tenantId, ex.getMessage());
            return BigDecimal.ZERO;
        }
    }

    private int safeVoidsToday(UUID tenantId, UUID locationId) {
        if (tenantId == null) {
            return 0;
        }
        try {
            return analyticsRepository.countVoidsToday(tenantId, locationId);
        } catch (Exception ex) {
            log.warn("voidsToday failed for tenant {}: {}", tenantId, ex.getMessage());
            return 0;
        }
    }

    private int safeOpenTills(UUID tenantId, UUID locationId) {
        if (tenantId == null) {
            return 0;
        }
        try {
            return analyticsRepository.countOpenTills(tenantId, locationId);
        } catch (Exception ex) {
            log.warn("openTills failed for tenant {}: {}", tenantId, ex.getMessage());
            return 0;
        }
    }

    private int safeCashiersToday(UUID tenantId, UUID locationId) {
        if (tenantId == null) {
            return 0;
        }
        try {
            return analyticsRepository.countCashiersToday(tenantId, locationId);
        } catch (Exception ex) {
            log.warn("cashiersToday failed for tenant {}: {}", tenantId, ex.getMessage());
            return 0;
        }
    }

    private List<Map<String, Object>> safeLocationBreakdown(UUID tenantId) {
        if (tenantId == null) {
            return List.of();
        }
        try {
            return analyticsRepository.locationBreakdown(tenantId);
        } catch (Exception ex) {
            log.warn("locationBreakdown failed for tenant {}: {}", tenantId, ex.getMessage());
            return List.of();
        }
    }

    private List<Map<String, Object>> safeLowStockAlerts(UUID tenantId, UUID locationId) {
        if (tenantId == null) {
            return List.of();
        }
        try {
            return analyticsRepository.lowStockAlerts(tenantId, locationId, 10);
        } catch (Exception ex) {
            log.warn("lowStockAlerts failed for tenant {}: {}", tenantId, ex.getMessage());
            return List.of();
        }
    }

    private List<Map<String, Object>> safeTopProducts(UUID tenantId, UUID locationId, int limit) {
        if (tenantId == null) {
            return List.of();
        }
        try {
            return analyticsRepository.topProductsToday(tenantId, locationId, limit);
        } catch (Exception ex) {
            log.warn("topProducts failed for tenant {}: {}", tenantId, ex.getMessage());
            return List.of();
        }
    }
}
