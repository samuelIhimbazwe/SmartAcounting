package com.smartaccounting.briefing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.forecast.ForecastService;
import com.smartaccounting.repository.HrKpiSnapshotJdbcRepository;
import com.smartaccounting.service.AnomalyCaseService;
import com.smartaccounting.service.CloseWorkflowService;
import com.smartaccounting.service.HrService;
import com.smartaccounting.service.InventoryService;
import com.smartaccounting.service.ReceivablesPayablesService;
import com.smartaccounting.service.ReconciliationMatchingService;
import com.smartaccounting.service.TillService;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Role-scoped KPI map for AI briefings. Delegates to domain services / projectors; stubs log WARN on the callee.
 */
@Service
public class BriefingMetricsService {

    private final CfoKpiProjector cfoKpiProjector;
    private final SalesKpiProjector salesKpiProjector;
    private final OpsKpiProjector opsKpiProjector;
    private final AnomalyCaseService anomalyCaseService;
    private final ReceivablesPayablesService receivablesPayablesService;
    private final ReconciliationMatchingService reconciliationMatchingService;
    private final TillService tillService;
    private final CloseWorkflowService closeWorkflowService;
    private final ForecastService forecastService;
    private final HrService hrService;
    private final MarketingBriefingService marketingBriefingService;
    private final InventoryService inventoryService;
    private final HrKpiSnapshotJdbcRepository hrKpiSnapshotJdbcRepository;
    private final ObjectMapper objectMapper;

    public BriefingMetricsService(
        CfoKpiProjector cfoKpiProjector,
        SalesKpiProjector salesKpiProjector,
        OpsKpiProjector opsKpiProjector,
        AnomalyCaseService anomalyCaseService,
        ReceivablesPayablesService receivablesPayablesService,
        ReconciliationMatchingService reconciliationMatchingService,
        TillService tillService,
        CloseWorkflowService closeWorkflowService,
        ForecastService forecastService,
        HrService hrService,
        MarketingBriefingService marketingBriefingService,
        InventoryService inventoryService,
        HrKpiSnapshotJdbcRepository hrKpiSnapshotJdbcRepository,
        ObjectMapper objectMapper
    ) {
        this.cfoKpiProjector = cfoKpiProjector;
        this.salesKpiProjector = salesKpiProjector;
        this.opsKpiProjector = opsKpiProjector;
        this.anomalyCaseService = anomalyCaseService;
        this.receivablesPayablesService = receivablesPayablesService;
        this.reconciliationMatchingService = reconciliationMatchingService;
        this.tillService = tillService;
        this.closeWorkflowService = closeWorkflowService;
        this.forecastService = forecastService;
        this.hrService = hrService;
        this.marketingBriefingService = marketingBriefingService;
        this.inventoryService = inventoryService;
        this.hrKpiSnapshotJdbcRepository = hrKpiSnapshotJdbcRepository;
        this.objectMapper = objectMapper;
    }

    public LinkedHashMap<String, Object> buildBriefingContext(UUID tenantId, String role) {
        LinkedHashMap<String, Object> metrics = new LinkedHashMap<>();
        if (tenantId == null) {
            return metrics;
        }
        try {
            switch (briefingRoleBucket(role)) {
                case "CEO" -> {
                    metrics.put("revenueToday", salesKpiProjector.getRevenueToday(tenantId));
                    metrics.put("revenueVsYesterday", salesKpiProjector.getRevenueVsYesterday(tenantId));
                    metrics.put("cashPosition", cfoKpiProjector.getCashPosition(tenantId));
                    metrics.put("cashRunwayDays", cfoKpiProjector.getCashRunwayDays(tenantId));
                    metrics.put("openAnomalies", anomalyCaseService.getOpenCount(tenantId));
                    metrics.put("overdueReceivables", receivablesPayablesService.getTotalOverdueAr(tenantId));
                    metrics.put("lowStockCount", opsKpiProjector.getLowStockCount(tenantId));
                }
                case "CFO" -> {
                    metrics.put("cashPosition", cfoKpiProjector.getCashPosition(tenantId));
                    metrics.put("cashRunwayDays", cfoKpiProjector.getCashRunwayDays(tenantId));
                    metrics.put("overdueReceivables", receivablesPayablesService.getTotalOverdueAr(tenantId));
                    metrics.put("overduePayables", receivablesPayablesService.getTotalOverdueAp(tenantId));
                    metrics.put("unmatchedReconciliations", reconciliationMatchingService.getUnmatchedCount(tenantId));
                    metrics.put("dso", cfoKpiProjector.getDso(tenantId));
                    metrics.put("dpo", cfoKpiProjector.getDpo(tenantId));
                    metrics.put("forecastAccuracy", forecastService.getAccuracy(tenantId));
                }
                case "SALES" -> {
                    metrics.put("revenueToday", salesKpiProjector.getRevenueToday(tenantId));
                    metrics.put("revenueVsTarget", salesKpiProjector.getRevenueVsTarget(tenantId));
                    metrics.put("topSellingProduct", salesKpiProjector.getTopSellingProduct(tenantId));
                    metrics.put("overdueCustomers", receivablesPayablesService.getOverdueCustomerCount(tenantId));
                    metrics.put("totalReceivables", receivablesPayablesService.getTotalOverdueAr(tenantId));
                    metrics.put("newCustomersToday", salesKpiProjector.getNewCustomersToday(tenantId));
                }
                case "ACCOUNTING" -> {
                    metrics.put("unmatchedItems", reconciliationMatchingService.getUnmatchedCount(tenantId));
                    metrics.put("tillVariancesToday", tillService.getVarianceCount(tenantId));
                    metrics.put("openCloseTasksCount", closeWorkflowService.getOpenTaskCount(tenantId));
                    metrics.put("unmatchedMoMo", reconciliationMatchingService.getUnmatchedMoMoCount(tenantId));
                    metrics.put("overdueInvoiceCount", receivablesPayablesService.getOverdueInvoiceCount(tenantId));
                }
                case "OPERATIONS" -> {
                    metrics.put("lowStockCount", opsKpiProjector.getLowStockCount(tenantId));
                    metrics.put("expiringThisWeek", inventoryService.getExpiringCount(tenantId, 7));
                    metrics.put("supplierPaymentsDueThisWeek", receivablesPayablesService.getSupplierPaymentsDueCount(tenantId, 7));
                    metrics.put("overdueSupplierCount", receivablesPayablesService.getOverdueSupplierCount(tenantId));
                    metrics.put("topCostDriver", opsKpiProjector.getTopCostDriver(tenantId));
                    metrics.put("inventoryTurnover", opsKpiProjector.getInventoryTurnover(tenantId));
                }
                case "HR" -> {
                    long hc = hrService.getHeadcount(tenantId);
                    metrics.put("headcount", hc);
                    metrics.put("openLeaveRequests", hrService.getOpenLeaveCount(tenantId));
                    metrics.put("payrollDueInDays", hrService.getPayrollDueInDays(tenantId));
                    metrics.put("revenuePerEmployee", salesKpiProjector.getRevenuePerEmployee(tenantId, hc));
                    enrichHrSnapshot(metrics, tenantId);
                }
                case "MARKETING" -> {
                    metrics.put("marketingSpendThisMonth", marketingBriefingService.getSpendThisMonth(tenantId));
                    metrics.put("revenueAttributed", marketingBriefingService.getAttributedRevenue(tenantId));
                    metrics.put("roiThisMonth", marketingBriefingService.getRoi(tenantId));
                    metrics.put("topChannel", marketingBriefingService.getTopChannel(tenantId));
                    metrics.put("newCustomersFromCampaigns", marketingBriefingService.getNewCustomers(tenantId));
                }
                default -> {
                    // Unknown roles: leave map empty; copilot fallback briefing still applies.
                }
            }
        } catch (RuntimeException ignored) {
            // Partial metrics are acceptable for briefing resilience.
        }
        return metrics;
    }

    private static String briefingRoleBucket(String role) {
        if (role == null) {
            return "CEO";
        }
        return switch (role.toLowerCase(Locale.ROOT)) {
            case "cfo" -> "CFO";
            case "sales" -> "SALES";
            case "accounting" -> "ACCOUNTING";
            case "operations", "ops" -> "OPERATIONS";
            case "hr" -> "HR";
            case "marketing" -> "MARKETING";
            default -> "CEO";
        };
    }

    private void enrichHrSnapshot(LinkedHashMap<String, Object> metrics, UUID tenantId) {
        try {
            Optional<String> payload = hrKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (payload.isEmpty()) {
                return;
            }
            JsonNode n = objectMapper.readTree(payload.get());
            long jdbcHc = toLong(metrics.get("headcount"));
            int proxy = n.path("headcountProxy").asInt(0);
            if (jdbcHc == 0 && proxy > 0) {
                metrics.put("headcount", (long) proxy);
            }
            metrics.putIfAbsent("payrollProxy", n.path("totalPayrollProxy").asDouble(0));
        } catch (Exception ignored) {
            // optional enrichment
        }
    }

    private static long toLong(Object v) {
        if (v == null) {
            return 0L;
        }
        if (v instanceof Number n) {
            return n.longValue();
        }
        return 0L;
    }
}
