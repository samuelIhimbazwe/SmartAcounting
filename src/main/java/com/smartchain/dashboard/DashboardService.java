package com.smartchain.dashboard;

import com.smartchain.audit.AuditService;
import com.smartchain.dto.AnomalyDto;
import com.smartchain.dto.ChartPointDto;
import com.smartchain.dto.KpiDto;
import com.smartchain.dto.RecommendedActionDto;
import com.smartchain.repository.CeoKpiSnapshotRepository;
import com.smartchain.repository.CfoKpiSnapshotJdbcRepository;
import com.smartchain.repository.HrKpiSnapshotJdbcRepository;
import com.smartchain.repository.MarketingKpiSnapshotJdbcRepository;
import com.smartchain.repository.OpsKpiSnapshotJdbcRepository;
import com.smartchain.repository.SalesKpiSnapshotJdbcRepository;
import com.smartchain.repository.AccountingKpiSnapshotJdbcRepository;
import com.smartchain.service.ActionQueueService;
import com.smartchain.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

@Service
public class DashboardService {
    private final AuditService auditService;
    private final CeoKpiSnapshotRepository ceoKpiSnapshotRepository;
    private final CfoKpiSnapshotJdbcRepository cfoKpiSnapshotJdbcRepository;
    private final SalesKpiSnapshotJdbcRepository salesKpiSnapshotJdbcRepository;
    private final OpsKpiSnapshotJdbcRepository opsKpiSnapshotJdbcRepository;
    private final HrKpiSnapshotJdbcRepository hrKpiSnapshotJdbcRepository;
    private final MarketingKpiSnapshotJdbcRepository marketingKpiSnapshotJdbcRepository;
    private final AccountingKpiSnapshotJdbcRepository accountingKpiSnapshotJdbcRepository;
    private final ActionQueueService actionQueueService;
    private final DashboardCacheService dashboardCacheService;
    private final JdbcTemplate jdbcTemplate;

    public DashboardService(AuditService auditService,
                            CeoKpiSnapshotRepository ceoKpiSnapshotRepository,
                            CfoKpiSnapshotJdbcRepository cfoKpiSnapshotJdbcRepository,
                            SalesKpiSnapshotJdbcRepository salesKpiSnapshotJdbcRepository,
                            OpsKpiSnapshotJdbcRepository opsKpiSnapshotJdbcRepository,
                            HrKpiSnapshotJdbcRepository hrKpiSnapshotJdbcRepository,
                            MarketingKpiSnapshotJdbcRepository marketingKpiSnapshotJdbcRepository,
                            AccountingKpiSnapshotJdbcRepository accountingKpiSnapshotJdbcRepository,
                            ActionQueueService actionQueueService,
                            DashboardCacheService dashboardCacheService,
                            JdbcTemplate jdbcTemplate) {
        this.auditService = auditService;
        this.ceoKpiSnapshotRepository = ceoKpiSnapshotRepository;
        this.cfoKpiSnapshotJdbcRepository = cfoKpiSnapshotJdbcRepository;
        this.salesKpiSnapshotJdbcRepository = salesKpiSnapshotJdbcRepository;
        this.opsKpiSnapshotJdbcRepository = opsKpiSnapshotJdbcRepository;
        this.hrKpiSnapshotJdbcRepository = hrKpiSnapshotJdbcRepository;
        this.marketingKpiSnapshotJdbcRepository = marketingKpiSnapshotJdbcRepository;
        this.accountingKpiSnapshotJdbcRepository = accountingKpiSnapshotJdbcRepository;
        this.actionQueueService = actionQueueService;
        this.dashboardCacheService = dashboardCacheService;
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<KpiDto> kpis(String role) {
        auditService.logAction("VIEW_DASHBOARD", role + "_KPI", "{}", "{}");
        setTenantConfig();
        if (TenantContext.tenantId() != null) {
            var cached = dashboardCacheService.getKpis(TenantContext.tenantId(), role.toLowerCase(), "default");
            if (cached.isPresent()) {
                return cached.get();
            }
        }
        List<KpiDto> calculated = computeKpis(role);
        if (TenantContext.tenantId() != null) {
            dashboardCacheService.setKpis(TenantContext.tenantId(), role.toLowerCase(), "default", calculated);
        }
        return calculated;
    }

    private List<KpiDto> computeKpis(String role) {
        if ("ceo".equalsIgnoreCase(role) && TenantContext.tenantId() != null) {
            Map<String, Object> snapshot = ceoKpiSnapshotRepository
                .findByTenantIdAndSnapshotDate(TenantContext.tenantId(), LocalDate.now())
                .map(row -> Map.of("payload", row.getPayload()))
                .orElse(Map.of());
            if (!snapshot.isEmpty()) {
                return List.of(
                    new KpiDto("event_count", "Event Volume", snapshot.get("payload").toString(), "Projected", "GREEN"),
                    new KpiDto("cash_runway", "Cash Runway", "Derived from snapshot", "Model", "AMBER"),
                    new KpiDto("forecast_accuracy", "Forecast Accuracy", "89%", "+2%", "GREEN")
                );
            }
        }
        if ("cfo".equalsIgnoreCase(role) && TenantContext.tenantId() != null) {
            var snapshot = cfoKpiSnapshotJdbcRepository.findTodayPayload(TenantContext.tenantId());
            if (snapshot.isPresent()) {
                return List.of(
                    new KpiDto("cfo_snapshot", "Financial Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("quick_ratio", "Quick Ratio (proxy)", "1.2", "+0.1", "GREEN"),
                    new KpiDto("journal_volume", "Journal Volume", "From projection", "Live", "AMBER")
                );
            }
        }
        if ("sales".equalsIgnoreCase(role) && TenantContext.tenantId() != null) {
            var snapshot = salesKpiSnapshotJdbcRepository.findTodayPayload(TenantContext.tenantId());
            if (snapshot.isPresent()) {
                return List.of(
                    new KpiDto("pipeline", "Pipeline Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("win_rate", "Win Rate (proxy)", "34%", "+2%", "GREEN"),
                    new KpiDto("forecast_accuracy", "Forecast Accuracy", "87%", "+1%", "AMBER")
                );
            }
        }
        if ("operations".equalsIgnoreCase(role) && TenantContext.tenantId() != null) {
            var snapshot = opsKpiSnapshotJdbcRepository.findTodayPayload(TenantContext.tenantId());
            if (snapshot.isPresent()) {
                return List.of(
                    new KpiDto("ops_snapshot", "Ops Efficiency Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("inventory_turnover", "Inventory Turnover (proxy)", "6.2x", "+0.3x", "GREEN"),
                    new KpiDto("supplier_index", "Supplier Cost Index", "1.08", "+0.02", "AMBER")
                );
            }
        }
        if ("hr".equalsIgnoreCase(role) && TenantContext.tenantId() != null) {
            var snapshot = hrKpiSnapshotJdbcRepository.findTodayPayload(TenantContext.tenantId());
            if (snapshot.isPresent()) {
                return List.of(
                    new KpiDto("hr_snapshot", "HR Workforce Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("turnover_rate", "Turnover Rate", "8.1%", "-0.4%", "GREEN"),
                    new KpiDto("revenue_per_employee", "Revenue per Employee", "12.4k", "+3%", "AMBER")
                );
            }
        }
        if ("marketing".equalsIgnoreCase(role) && TenantContext.tenantId() != null) {
            var snapshot = marketingKpiSnapshotJdbcRepository.findTodayPayload(TenantContext.tenantId());
            if (snapshot.isPresent()) {
                return List.of(
                    new KpiDto("marketing_snapshot", "Marketing ROI Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("blended_roi", "Blended ROI", "3.1x", "+0.2x", "GREEN"),
                    new KpiDto("ltv_cac_ratio", "LTV:CAC", "3.4x", "+0.1x", "GREEN")
                );
            }
        }
        if ("accounting".equalsIgnoreCase(role) && TenantContext.tenantId() != null) {
            var snapshot = accountingKpiSnapshotJdbcRepository.findTodayPayload(TenantContext.tenantId());
            if (snapshot.isPresent()) {
                return List.of(
                    new KpiDto("accounting_snapshot", "Accounting Close Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("reconciliation_status", "Reconciliation Status", "92%", "+4%", "GREEN"),
                    new KpiDto("compliance_flags", "Compliance Flags", "2", "-1", "AMBER")
                );
            }
        }
        return List.of(
            new KpiDto("revenue_growth", "Revenue Growth", "12.4%", "+1.8%", "GREEN"),
            new KpiDto("cash_runway", "Cash Runway", "74 days", "-4 days", "AMBER"),
            new KpiDto("forecast_accuracy", "Forecast Accuracy", "89%", "+2%", "GREEN")
        );
    }

    public List<ChartPointDto> chart(String role, String widget) {
        auditService.logAction("VIEW_DASHBOARD", role + "_CHART_" + widget, "{}", "{}");
        return List.of(
            new ChartPointDto(LocalDate.now().minusDays(2), BigDecimal.valueOf(120), widget),
            new ChartPointDto(LocalDate.now().minusDays(1), BigDecimal.valueOf(137), widget),
            new ChartPointDto(LocalDate.now(), BigDecimal.valueOf(141), widget)
        );
    }

    public Map<String, Object> chartDrilldown(String role, String widget, int page, int size, LocalDate from, LocalDate to) {
        auditService.logAction("VIEW_DASHBOARD", role + "_DRILLDOWN_" + widget, "{}", "{}");
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.minusDays(30) : from;
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        List<Map<String, Object>> rows = IntStream.range(0, safeSize)
            .mapToObj(i -> {
                LocalDate d = start.plusDays((long) safePage * safeSize + i);
                return Map.<String, Object>of(
                    "date", d.toString(),
                    "widget", widget,
                    "value", 100 + ((safePage * safeSize + i) % 47),
                    "reference", role.toUpperCase() + "-TX-" + (safePage * safeSize + i + 1)
                );
            })
            .toList();
        return Map.of(
            "page", safePage,
            "size", safeSize,
            "from", start.toString(),
            "to", end.toString(),
            "rows", rows
        );
    }

    public List<AnomalyDto> anomalies(String role) {
        return List.of(
            new AnomalyDto(UUID.randomUUID().toString(), "HIGH", "Unexpected cost spike", "Supplier transport cost up 22% vs 90-day average."),
            new AnomalyDto(UUID.randomUUID().toString(), "MEDIUM", "Revenue slowdown", "Weekly bookings are 13% below rolling baseline.")
        );
    }

    public List<String> alerts(String role) {
        return List.of("Cash runway below configured threshold.", "AR overdue bucket > 90 days increased.");
    }

    public List<RecommendedActionDto> actions(String role) {
        return List.of(
            new RecommendedActionDto("act-1", "APPROVAL", "Approve PO #4421 ($12,400)", "Avoid procurement delay"),
            new RecommendedActionDto("act-2", "ESCALATION", "Escalate overdue invoice to Finance Director", "Improve DSO by 2-4 days")
        );
    }

    public String executeAction(String type, String actionId) {
        auditService.logAction("APPROVE_ACTION", "DASHBOARD_ACTION", "{}", "{\"type\":\"" + type + "\",\"actionId\":\"" + actionId + "\"}");
        actionQueueService.enqueue(type, actionId, "{\"source\":\"dashboard\"}");
        return "Action queued for workflow execution: " + actionId;
    }

    private void setTenantConfig() {
        if (TenantContext.tenantId() != null) {
            jdbcTemplate.queryForObject(
                "select set_config('app.tenant_id', ?, true)",
                String.class,
                TenantContext.tenantId().toString()
            );
        }
    }
}
