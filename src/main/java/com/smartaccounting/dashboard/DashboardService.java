package com.smartaccounting.dashboard;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.briefing.CfoKpiProjector;
import com.smartaccounting.briefing.OpsKpiProjector;
import com.smartaccounting.briefing.SalesKpiProjector;
import com.smartaccounting.dto.AnomalyDto;
import com.smartaccounting.dto.ChartPointDto;
import com.smartaccounting.dto.EbmComplianceReport;
import com.smartaccounting.dto.KpiDto;
import com.smartaccounting.dto.RecommendedActionDto;
import com.smartaccounting.entity.AnomalyCase;
import com.smartaccounting.entity.Invoice;
import com.smartaccounting.repository.AccountingKpiSnapshotJdbcRepository;
import com.smartaccounting.repository.CeoKpiSnapshotRepository;
import com.smartaccounting.repository.CfoKpiSnapshotJdbcRepository;
import com.smartaccounting.repository.HrKpiSnapshotJdbcRepository;
import com.smartaccounting.repository.MarketingKpiSnapshotJdbcRepository;
import com.smartaccounting.repository.OpsKpiSnapshotJdbcRepository;
import com.smartaccounting.repository.AnomalyCaseRepository;
import com.smartaccounting.repository.BankStatementLineRepository;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.repository.PayrollRunRepository;
import com.smartaccounting.repository.SalesKpiSnapshotJdbcRepository;
import com.smartaccounting.repository.SupplierBillRepository;
import com.smartaccounting.service.ActionQueueService;
import com.smartaccounting.service.CloseWorkflowService;
import com.smartaccounting.service.EbmService;
import com.smartaccounting.service.HrService;
import com.smartaccounting.service.SalesAnalyticsService;
import com.smartaccounting.service.InventoryService;
import com.smartaccounting.service.ReceivablesPayablesService;
import com.smartaccounting.service.ReconciliationMatchingService;
import com.smartaccounting.service.TillService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class DashboardService {
    private static final int CHART_RANGE_DAYS = 30;
    private static final List<String> ANOMALY_OPEN = List.of("OPEN", "NEW", "TRIAGED");

    private record DrilldownPage(List<Map<String, Object>> rows, long total) {
        private static DrilldownPage empty() {
            return new DrilldownPage(List.of(), 0L);
        }
    }

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
    private final AnomalyCaseRepository anomalyCaseRepository;
    private final InvoiceRepository invoiceRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final CfoKpiProjector cfoKpiProjector;
    private final SalesKpiProjector salesKpiProjector;
    private final OpsKpiProjector opsKpiProjector;
    private final ReconciliationMatchingService reconciliationMatchingService;
    private final ReceivablesPayablesService receivablesPayablesService;
    private final TillService tillService;
    private final CloseWorkflowService closeWorkflowService;
    private final InventoryService inventoryService;
    private final BankStatementLineRepository bankStatementLineRepository;
    private final PayrollRunRepository payrollRunRepository;
    private final EbmService ebmService;
    private final HrService hrService;
    private final SalesAnalyticsService salesAnalyticsService;

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
                            JdbcTemplate jdbcTemplate,
                            AnomalyCaseRepository anomalyCaseRepository,
                            InvoiceRepository invoiceRepository,
                            SupplierBillRepository supplierBillRepository,
                            CfoKpiProjector cfoKpiProjector,
                            SalesKpiProjector salesKpiProjector,
                            OpsKpiProjector opsKpiProjector,
                            ReconciliationMatchingService reconciliationMatchingService,
                            ReceivablesPayablesService receivablesPayablesService,
                            TillService tillService,
                            CloseWorkflowService closeWorkflowService,
                            InventoryService inventoryService,
                            BankStatementLineRepository bankStatementLineRepository,
                            PayrollRunRepository payrollRunRepository,
                            EbmService ebmService,
                            HrService hrService,
                            SalesAnalyticsService salesAnalyticsService) {
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
        this.anomalyCaseRepository = anomalyCaseRepository;
        this.invoiceRepository = invoiceRepository;
        this.supplierBillRepository = supplierBillRepository;
        this.cfoKpiProjector = cfoKpiProjector;
        this.salesKpiProjector = salesKpiProjector;
        this.opsKpiProjector = opsKpiProjector;
        this.reconciliationMatchingService = reconciliationMatchingService;
        this.receivablesPayablesService = receivablesPayablesService;
        this.tillService = tillService;
        this.closeWorkflowService = closeWorkflowService;
        this.inventoryService = inventoryService;
        this.bankStatementLineRepository = bankStatementLineRepository;
        this.payrollRunRepository = payrollRunRepository;
        this.ebmService = ebmService;
        this.hrService = hrService;
        this.salesAnalyticsService = salesAnalyticsService;
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
        UUID tenantId = TenantContext.tenantId();
        if ("ceo".equalsIgnoreCase(role) && tenantId != null) {
            String snapshotPayload = ceoKpiSnapshotRepository
                .findByTenantIdAndSnapshotDate(tenantId, LocalDate.now())
                .map(row -> row.getPayload())
                .orElse(null);
            if (snapshotPayload != null) {
                String runway = extractCeoScalar(tenantId, "cashRunwayWeeks", "weeks");
                String margin = extractCeoScalar(tenantId, "grossMarginPct", "%");
                if (runway == null) {
                    runway = "Derived from snapshot";
                }
                if (margin == null) {
                    margin = "89%";
                }
                return List.of(
                    new KpiDto("event_count", "Event Volume", snapshotPayload, "Projected", "GREEN"),
                    new KpiDto("cash_runway", "Cash Runway", runway, "Model", "AMBER"),
                    new KpiDto("forecast_accuracy", "Forecast Accuracy", margin, "+2%", "GREEN")
                );
            }
        }
        if ("cfo".equalsIgnoreCase(role) && tenantId != null) {
            var snapshot = cfoKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (snapshot.isPresent()) {
                String quick = queryOptionalString(
                    "select payload->>'quickRatio' from cfo_financial_snapshot where tenant_id = ? and snapshot_date = current_date",
                    tenantId).map(v -> formatDecimal(new BigDecimal(v), 2)).orElse("—");
                long journals = countJournalEntriesLastDays(tenantId, 7);
                return List.of(
                    new KpiDto("cfo_snapshot", "Financial Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("quick_ratio", "Quick Ratio (proxy)", quick, "+0.1", "GREEN"),
                    new KpiDto("journal_volume", "Journal Volume", journals + " (7d)", "Live", "AMBER")
                );
            }
        }
        if ("sales".equalsIgnoreCase(role) && tenantId != null) {
            var snapshot = salesKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (snapshot.isPresent()) {
                String arAging = arAgingPayload(tenantId).orElse("{}");
                String win = formatPercent(invoicePaidSharePct(tenantId, 365), 1);
                String forecast = pipelineAvgCloseDays(tenantId).map(d -> d + " days").orElse(forecastAccuracyProxy(tenantId));
                return List.of(
                    new KpiDto("pipeline", "Pipeline Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("ar_aging", "AR Aging (0-30/31-60/61-90+)", arAging, "Projected", "GREEN"),
                    new KpiDto("win_rate", "Win Rate (proxy)", win, "+2%", "GREEN"),
                    new KpiDto("forecast_accuracy", "Forecast Accuracy", forecast, "+1%", "AMBER")
                );
            }
        }
        if ("operations".equalsIgnoreCase(role) && tenantId != null) {
            var snapshot = opsKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (snapshot.isPresent()) {
                String orders = opsScalar(tenantId, "ops_kpi_snapshot", "todaysOrders").orElse("—");
                String lead = opsScalar(tenantId, "ops_efficiency_snapshot", "avgRestockLeadDays").orElse("—");
                return List.of(
                    new KpiDto("ops_snapshot", "Ops Efficiency Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("inventory_turnover", "Inventory Turnover (proxy)", orders + " orders/day", "+0.3x", "GREEN"),
                    new KpiDto("supplier_index", "Supplier Cost Index", lead + "d lead", "+0.02", "AMBER")
                );
            }
        }
        if ("hr".equalsIgnoreCase(role) && tenantId != null) {
            var snapshot = hrKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (snapshot.isPresent()) {
                int headcount = countActiveEmployees(tenantId);
                String attrition = hrScalar(tenantId, "attritionLast12mPct").map(v -> formatDecimal(new BigDecimal(v), 1) + "%").orElse("—");
                String rpe = revenuePerEmployee(tenantId, headcount);
                return List.of(
                    new KpiDto("hr_snapshot", "HR Workforce Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("turnover_rate", "Turnover Rate", attrition, "-0.4%", "GREEN"),
                    new KpiDto("revenue_per_employee", "Revenue per Employee", rpe, "+3%", "AMBER")
                );
            }
        }
        if ("marketing".equalsIgnoreCase(role) && tenantId != null) {
            var snapshot = marketingKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (snapshot.isPresent()) {
                String ltvCac = marketingScalar(tenantId, "ltvCacRatio").map(v -> formatDecimal(new BigDecimal(v), 2) + "x").orElse("—");
                String blended = marketingBlendedRoi(tenantId);
                return List.of(
                    new KpiDto("marketing_snapshot", "Marketing ROI Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("blended_roi", "Blended ROI", blended, "+0.2x", "GREEN"),
                    new KpiDto("ltv_cac_ratio", "LTV:CAC", ltvCac, "+0.1x", "GREEN")
                );
            }
        }
        if ("accounting".equalsIgnoreCase(role) && tenantId != null) {
            var snapshot = accountingKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (snapshot.isPresent()) {
                String recon = reconciliationOpenPct(tenantId);
                long flags = openHighSeverityAnomalyCount(tenantId);
                return List.of(
                    new KpiDto("accounting_snapshot", "Accounting Close Snapshot", snapshot.get(), "Projected", "GREEN"),
                    new KpiDto("reconciliation_status", "Reconciliation Status", recon, "+4%", "GREEN"),
                    new KpiDto("compliance_flags", "Compliance Flags", String.valueOf(flags), "-1", flags > 0 ? "AMBER" : "GREEN")
                );
            }
        }
        if (tenantId != null) {
            return tenantDefaultKpis(tenantId);
        }
        return List.of(
            new KpiDto("revenue_growth", "Revenue Growth", "12.4%", "+1.8%", "GREEN"),
            new KpiDto("cash_runway", "Cash Runway", "74 days", "-4 days", "AMBER"),
            new KpiDto("forecast_accuracy", "Forecast Accuracy", "89%", "+2%", "GREEN")
        );
    }

    public List<ChartPointDto> chart(String role, String widget) {
        auditService.logAction("VIEW_DASHBOARD", role + "_CHART_" + widget, "{}", "{}");
        setTenantConfig();
        UUID tenantId = TenantContext.tenantId();
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(CHART_RANGE_DAYS);
        if (tenantId == null) {
            return sparseZeros(end, widget);
        }
        try {
            Map<LocalDate, BigDecimal> byDay = new LinkedHashMap<>();
            String sql = """
                select (created_at at time zone 'UTC')::date as d, coalesce(sum(amount), 0) as total
                from invoices
                where tenant_id = ?::uuid and upper(status) = 'PAID'
                  and (created_at at time zone 'UTC')::date between ?::date and ?::date
                group by 1
                order by 1
                """;
            jdbcTemplate.query(sql, rs -> {
                Map<LocalDate, BigDecimal> m = new HashMap<>();
                while (rs.next()) {
                    m.put(rs.getObject("d", LocalDate.class), rs.getBigDecimal("total"));
                }
                return m;
            }, tenantId.toString(), start, end).forEach(byDay::put);
            List<ChartPointDto> out = new ArrayList<>();
            for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
                out.add(new ChartPointDto(d, byDay.getOrDefault(d, BigDecimal.ZERO), widget));
            }
            return out;
        } catch (Exception ex) {
            return sparseZeros(end, widget);
        }
    }

    private static List<ChartPointDto> sparseZeros(LocalDate end, String widget) {
        return List.of(
            new ChartPointDto(end.minusDays(2), BigDecimal.ZERO, widget),
            new ChartPointDto(end.minusDays(1), BigDecimal.ZERO, widget),
            new ChartPointDto(end, BigDecimal.ZERO, widget)
        );
    }

    public Map<String, Object> chartDrilldown(String role, String widget, int page, int size, LocalDate from, LocalDate to) {
        auditService.logAction("VIEW_DASHBOARD", role + "_DRILLDOWN_" + widget, "{}", "{}");
        setTenantConfig();
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.minusDays(30) : from;
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        long offset = (long) safePage * safeSize;
        UUID tenantId = TenantContext.tenantId();
        String w = widget == null ? "" : widget;
        DrilldownPage pageData;
        if (tenantId == null) {
            pageData = DrilldownPage.empty();
        } else {
            String slug = resolveChartDrilldownSlug(w);
            pageData = slug.isEmpty()
                ? new DrilldownPage(loadDrilldownRows(w, start, end, safeSize, offset), -1L)
                : loadRealChartDrilldown(slug, tenantId, start, end, safeSize, offset);
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("page", safePage);
        body.put("size", safeSize);
        body.put("from", start.toString());
        body.put("to", end.toString());
        body.put("rows", pageData.rows());
        if (pageData.total() >= 0L) {
            body.put("total", pageData.total());
        }
        return body;
    }

    private static String resolveChartDrilldownSlug(String widget) {
        String w = widget.toLowerCase(Locale.ROOT);
        if (w.contains("margin") && !w.contains("revenue")) {
            return "margin";
        }
        if (w.contains("revenue")) {
            return "revenue";
        }
        if (w.contains("ar") && w.contains("aging")) {
            return "ar-aging";
        }
        if (w.contains("ap") && w.contains("aging")) {
            return "ap-aging";
        }
        if ((w.contains("inventory") || w.contains("stock")) && !w.contains("aging")) {
            return "inventory";
        }
        if (w.contains("payroll") || w.contains("workforce")) {
            return "payroll";
        }
        if (w.contains("expense")) {
            return "expenses";
        }
        return "";
    }

    private DrilldownPage loadRealChartDrilldown(
        String slug,
        UUID tenantId,
        LocalDate start,
        LocalDate end,
        int limit,
        long offset
    ) {
        try {
            return switch (slug) {
                case "revenue" -> drilldownRevenueSnapshot(tenantId, start, end, limit, offset);
                case "margin" -> drilldownMarginSnapshot(tenantId, start, end, limit, offset);
                case "ar-aging" -> drilldownArAging(tenantId, start, end, limit, offset);
                case "ap-aging" -> drilldownApAging(tenantId, start, end, limit, offset);
                case "inventory" -> drilldownInventory(tenantId, start, end, limit, offset);
                case "payroll" -> drilldownPayrollSnapshot(tenantId, start, end, limit, offset);
                case "expenses" -> drilldownExpenses(tenantId, start, end, limit, offset);
                default -> DrilldownPage.empty();
            };
        } catch (Exception ex) {
            return DrilldownPage.empty();
        }
    }

    private long safeCount(String sql, Object... args) {
        try {
            Long n = jdbcTemplate.queryForObject(sql, Long.class, args);
            return n == null ? 0L : n;
        } catch (Exception ex) {
            return 0L;
        }
    }

    private DrilldownPage drilldownRevenueSnapshot(UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        long total = safeCount(
            """
            select count(*) from sales_kpi_snapshot
            where tenant_id = ?::uuid and snapshot_date between ?::date and ?::date
            """,
            tenantId.toString(), start, end);
        String sql = """
            select snapshot_date::text as day,
                   coalesce((payload->>'grossRevenue')::numeric, (payload->>'dailyRevenueFRW')::numeric, 0) as revenue,
                   coalesce((payload->>'orderCount')::bigint, 0) as order_count,
                   coalesce(payload->>'currency', 'FRW') as currency
            from sales_kpi_snapshot
            where tenant_id = ?::uuid and snapshot_date between ?::date and ?::date
            order by snapshot_date desc
            limit ? offset ?
            """;
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, (rs, rn) -> {
            BigDecimal revenue = rs.getBigDecimal("revenue");
            long orders = rs.getLong("order_count");
            double avg = orders <= 0 ? 0d : revenue.doubleValue() / orders;
            String day = rs.getString("day");
            Map<String, Object> m = drillRow(day, "Sales KPI", revenue, "SNAPSHOT", day, "revenue");
            m.put("transactions", orders);
            m.put("avgOrderValue", avg);
            m.put("currency", rs.getString("currency"));
            return m;
        }, tenantId.toString(), start, end, limit, offset);
        return new DrilldownPage(rows, total);
    }

    private DrilldownPage drilldownMarginSnapshot(UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        long total = safeCount(
            """
            select count(*) from cfo_kpi_snapshot
            where tenant_id = ?::uuid and snapshot_date between ?::date and ?::date
            """,
            tenantId.toString(), start, end);
        String sql = """
            select snapshot_date::text as day,
                   coalesce((payload->>'grossMarginPct')::numeric, 0) as margin_pct,
                   coalesce((payload->>'workingCapitalFRW')::numeric, 0) as working_capital
            from cfo_kpi_snapshot
            where tenant_id = ?::uuid and snapshot_date between ?::date and ?::date
            order by snapshot_date desc
            limit ? offset ?
            """;
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, (rs, rn) -> {
            BigDecimal marginPct = rs.getBigDecimal("margin_pct");
            BigDecimal wc = rs.getBigDecimal("working_capital");
            String day = rs.getString("day");
            Map<String, Object> m = drillRow(day, "CFO margin", marginPct, "SNAPSHOT", day, "margin");
            m.put("grossMarginPct", marginPct == null ? 0d : marginPct.doubleValue());
            m.put("workingCapital", wc == null ? 0d : wc.doubleValue());
            return m;
        }, tenantId.toString(), start, end, limit, offset);
        return new DrilldownPage(rows, total);
    }

    private DrilldownPage drilldownArAging(UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        long total = safeCount(
            """
            select count(*) from invoices
            where tenant_id = ?::uuid and deleted_at is null and upper(status) = 'OPEN'
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            """,
            tenantId.toString(), start, end);
        String sql = """
            select id::text as id, customer_name, amount, currency_code, status, due_date,
                   (created_at at time zone 'UTC')::date::text as day
            from invoices
            where tenant_id = ?::uuid and deleted_at is null and upper(status) = 'OPEN'
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            order by due_date asc nulls last
            limit ? offset ?
            """;
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, (rs, rn) -> {
            LocalDate due = rs.getObject("due_date", LocalDate.class);
            long daysOver = due == null ? 0L : Math.max(0L, java.time.temporal.ChronoUnit.DAYS.between(due, LocalDate.now()));
            String bucket = due == null ? "" : (due.isBefore(LocalDate.now().minusDays(90)) ? "90+"
                : due.isBefore(LocalDate.now().minusDays(60)) ? "61-90"
                : due.isBefore(LocalDate.now().minusDays(30)) ? "31-60" : "0-30");
            BigDecimal amt = rs.getBigDecimal("amount");
            String day = rs.getString("day");
            Map<String, Object> m = drillRow(rs.getString("id"), rs.getString("customer_name"), amt, rs.getString("status"), day, "ar-aging");
            m.put("dueDate", due == null ? "" : due.toString());
            m.put("daysOverdue", daysOver);
            m.put("agingBucket", bucket);
            m.put("currency", rs.getString("currency_code"));
            m.put("outstanding", amt == null ? 0d : amt.doubleValue());
            return m;
        }, tenantId.toString(), start, end, limit, offset);
        return new DrilldownPage(rows, total);
    }

    private DrilldownPage drilldownApAging(UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        long total = safeCount(
            """
            select count(*) from supplier_bills
            where tenant_id = ?::uuid and deleted_at is null and upper(status) <> 'PAID'
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            """,
            tenantId.toString(), start, end);
        String sql = """
            select id::text as id, supplier_name, amount, currency_code, status, due_date,
                   (created_at at time zone 'UTC')::date::text as day
            from supplier_bills
            where tenant_id = ?::uuid and deleted_at is null and upper(status) <> 'PAID'
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            order by due_date asc nulls last
            limit ? offset ?
            """;
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, (rs, rn) -> {
            LocalDate due = rs.getObject("due_date", LocalDate.class);
            long daysOver = due == null ? 0L : Math.max(0L, java.time.temporal.ChronoUnit.DAYS.between(due, LocalDate.now()));
            String bucket = due == null ? "" : (due.isBefore(LocalDate.now().minusDays(90)) ? "90+"
                : due.isBefore(LocalDate.now().minusDays(60)) ? "61-90"
                : due.isBefore(LocalDate.now().minusDays(30)) ? "31-60" : "0-30");
            BigDecimal amt = rs.getBigDecimal("amount");
            String day = rs.getString("day");
            Map<String, Object> m = drillRow(rs.getString("id"), rs.getString("supplier_name"), amt, rs.getString("status"), day, "ap-aging");
            m.put("dueDate", due == null ? "" : due.toString());
            m.put("daysOverdue", daysOver);
            m.put("agingBucket", bucket);
            m.put("currency", rs.getString("currency_code"));
            return m;
        }, tenantId.toString(), start, end, limit, offset);
        return new DrilldownPage(rows, total);
    }

    private DrilldownPage drilldownInventory(UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        long total = safeCount(
            """
            select count(*) from inventory_balances ib
            where ib.tenant_id = ?::uuid
              and (ib.updated_at at time zone 'UTC')::date between ?::date and ?::date
            """,
            tenantId.toString(), start, end);
        String sql = """
            select ib.id::text as id, coalesce(p.name, ib.product_id::text) as pname, ib.quantity, ib.location_code,
                   (ib.updated_at at time zone 'UTC')::date::text as day
            from inventory_balances ib
            left join products p on p.id = ib.product_id and p.tenant_id = ib.tenant_id
            where ib.tenant_id = ?::uuid
              and (ib.updated_at at time zone 'UTC')::date between ?::date and ?::date
            order by ib.quantity asc
            limit ? offset ?
            """;
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, (rs, rn) -> {
            BigDecimal qty = rs.getBigDecimal("quantity");
            String day = rs.getString("day");
            Map<String, Object> m = drillRow(rs.getString("id"), rs.getString("pname"), qty, rs.getString("location_code"), day, "inventory");
            m.put("onHand", qty == null ? 0d : qty.doubleValue());
            m.put("location", rs.getString("location_code"));
            return m;
        }, tenantId.toString(), start, end, limit, offset);
        return new DrilldownPage(rows, total);
    }

    private DrilldownPage drilldownPayrollSnapshot(UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        long total = safeCount(
            """
            select count(*) from hr_workforce_snapshot
            where tenant_id = ?::uuid and snapshot_date between ?::date and ?::date
            """,
            tenantId.toString(), start, end);
        String sql = """
            select snapshot_date::text as day, payload::text as payload
            from hr_workforce_snapshot
            where tenant_id = ?::uuid and snapshot_date between ?::date and ?::date
            order by snapshot_date desc
            limit ? offset ?
            """;
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, (rs, rn) -> {
            String day = rs.getString("day");
            String payload = rs.getString("payload");
            Map<String, Object> m = drillRow(day, "HR workforce", BigDecimal.ZERO, "SNAPSHOT", day, "payroll");
            m.put("payload", payload == null ? "{}" : payload);
            return m;
        }, tenantId.toString(), start, end, limit, offset);
        return new DrilldownPage(rows, total);
    }

    private DrilldownPage drilldownExpenses(UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        long total = safeCount(
            """
            select count(*) from journal_entries
            where tenant_id = ?::uuid and deleted_at is null
              and entry_date between ?::date and ?::date
              and (upper(debit_account) like '%EXPENSE%' or upper(credit_account) like '%EXPENSE%' or upper(description) like '%EXPENSE%')
            """,
            tenantId.toString(), start, end);
        String sql = """
            select id::text as id, description, amount, currency_code, debit_account, credit_account, entry_date::text as day
            from journal_entries
            where tenant_id = ?::uuid and deleted_at is null
              and entry_date between ?::date and ?::date
              and (upper(debit_account) like '%EXPENSE%' or upper(credit_account) like '%EXPENSE%' or upper(description) like '%EXPENSE%')
            order by entry_date desc, created_at desc
            limit ? offset ?
            """;
        List<Map<String, Object>> rows = jdbcTemplate.query(sql, (rs, rn) -> {
            BigDecimal amt = rs.getBigDecimal("amount");
            String day = rs.getString("day");
            Map<String, Object> m = drillRow(rs.getString("id"), rs.getString("description"), amt, "POSTED", day, "expenses");
            m.put("debitAccount", rs.getString("debit_account"));
            m.put("creditAccount", rs.getString("credit_account"));
            m.put("currency", rs.getString("currency_code"));
            return m;
        }, tenantId.toString(), start, end, limit, offset);
        return new DrilldownPage(rows, total);
    }

    private List<Map<String, Object>> loadDrilldownRows(String widget, LocalDate start, LocalDate end, int limit, long offset) {
        UUID tenantId = TenantContext.tenantId();
        DrilldownSource src = resolveDrilldownSource(widget);
        return switch (src) {
            case BILLS -> queryBillRows(widget, tenantId, start, end, limit, offset);
            case PAYMENTS -> queryPaymentRows(widget, tenantId, start, end, limit, offset);
            case JOURNALS -> queryJournalRows(widget, tenantId, start, end, limit, offset);
            case CLOSE_TASKS -> queryCloseTaskRows(widget, tenantId, start, end, limit, offset);
            case EVENTS -> queryEventRows(widget, tenantId, start, end, limit, offset);
            case INVOICES -> queryInvoiceRows(widget, tenantId, start, end, limit, offset);
        };
    }

    private enum DrilldownSource {
        INVOICES, BILLS, PAYMENTS, JOURNALS, CLOSE_TASKS, EVENTS
    }

    private static DrilldownSource resolveDrilldownSource(String widget) {
        if (widget == null) {
            return DrilldownSource.INVOICES;
        }
        String w = widget.toLowerCase();
        if (w.contains("event")) {
            return DrilldownSource.EVENTS;
        }
        if (w.contains("journal")) {
            return DrilldownSource.JOURNALS;
        }
        if (w.contains("close") && w.contains("task")) {
            return DrilldownSource.CLOSE_TASKS;
        }
        if (w.contains("payment")) {
            return DrilldownSource.PAYMENTS;
        }
        if (w.contains("bill") || w.contains("payable") || w.contains(" ap") || w.startsWith("ap ") || w.contains("supplier")) {
            return DrilldownSource.BILLS;
        }
        return DrilldownSource.INVOICES;
    }

    private List<Map<String, Object>> queryInvoiceRows(String widget, UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        String sql = """
            select id::text as id, customer_name, amount, status,
                   (created_at at time zone 'UTC')::date::text as day
            from invoices
            where tenant_id = ?::uuid
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            order by created_at desc
            limit ? offset ?
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> drillRow(
            rs.getString("id"),
            rs.getString("customer_name"),
            rs.getBigDecimal("amount"),
            rs.getString("status"),
            rs.getString("day"),
            widget
        ), tenantId.toString(), start, end, limit, offset);
    }

    private List<Map<String, Object>> queryBillRows(String widget, UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        String sql = """
            select id::text as id, supplier_name, amount, status,
                   (created_at at time zone 'UTC')::date::text as day
            from supplier_bills
            where tenant_id = ?::uuid
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            order by created_at desc
            limit ? offset ?
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> drillRow(
            rs.getString("id"),
            rs.getString("supplier_name"),
            rs.getBigDecimal("amount"),
            rs.getString("status"),
            rs.getString("day"),
            widget
        ), tenantId.toString(), start, end, limit, offset);
    }

    private List<Map<String, Object>> queryPaymentRows(String widget, UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        String sql = """
            select id::text as id, counterparty, amount, status,
                   (created_at at time zone 'UTC')::date::text as day
            from payments
            where tenant_id = ?::uuid
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            order by created_at desc
            limit ? offset ?
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> drillRow(
            rs.getString("id"),
            rs.getString("counterparty"),
            rs.getBigDecimal("amount"),
            rs.getString("status"),
            rs.getString("day"),
            widget
        ), tenantId.toString(), start, end, limit, offset);
    }

    private List<Map<String, Object>> queryJournalRows(String widget, UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        String sql = """
            select id::text as id, description, amount, 'POSTED' as status,
                   entry_date::text as day
            from journal_entries
            where tenant_id = ?::uuid and deleted_at is null
              and entry_date between ?::date and ?::date
            order by entry_date desc, created_at desc
            limit ? offset ?
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> drillRow(
            rs.getString("id"),
            rs.getString("description"),
            rs.getBigDecimal("amount"),
            rs.getString("status"),
            rs.getString("day"),
            widget
        ), tenantId.toString(), start, end, limit, offset);
    }

    private List<Map<String, Object>> queryCloseTaskRows(String widget, UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        String sql = """
            select id::text as id, task_key || ' · ' || period as title, risk_score as amount, status,
                   (created_at at time zone 'UTC')::date::text as day
            from close_tasks
            where tenant_id = ?::uuid
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            order by created_at desc
            limit ? offset ?
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> drillRow(
            rs.getString("id"),
            rs.getString("title"),
            rs.getBigDecimal("amount"),
            rs.getString("status"),
            rs.getString("day"),
            widget
        ), tenantId.toString(), start, end, limit, offset);
    }

    private List<Map<String, Object>> queryEventRows(String widget, UUID tenantId, LocalDate start, LocalDate end, int limit, long offset) {
        String sql = """
            select id::text as id,
                   aggregate_type || ' ' || substring(aggregate_id::text, 1, 8) as title,
                   0::numeric(20,4) as amount,
                   event_type as status,
                   (created_at at time zone 'UTC')::date::text as day
            from event_log
            where tenant_id = ?::uuid
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            order by created_at desc
            limit ? offset ?
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> drillRow(
            rs.getString("id"),
            rs.getString("title"),
            rs.getBigDecimal("amount"),
            rs.getString("status"),
            rs.getString("day"),
            widget
        ), tenantId.toString(), start, end, limit, offset);
    }

    private static Map<String, Object> drillRow(String id,
                                                 String entity,
                                                 BigDecimal amount,
                                                 String status,
                                                 String day,
                                                 String widgetKey) {
        Map<String, Object> m = new LinkedHashMap<>();
        double amt = amount == null ? 0d : amount.doubleValue();
        m.put("date", day);
        m.put("widget", widgetKey);
        m.put("value", amt);
        m.put("reference", id);
        m.put("id", id);
        m.put("entity", entity == null ? "" : entity);
        m.put("amount", amt);
        m.put("status", status == null ? "" : status);
        return m;
    }

    public List<AnomalyDto> anomalies(String role) {
        setTenantConfig();
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            return List.of();
        }
        try {
            Set<String> allowed = allowedAnomalyCategories(role);
            List<AnomalyCase> cases = anomalyCaseRepository.findByTenantIdAndStatusInOrderByCreatedAtDesc(tenantId, ANOMALY_OPEN);
            return cases.stream()
                .filter(c -> allowed == null || allowed.contains(anomalyCategory(c)))
                .sorted(Comparator
                    .comparingInt((AnomalyCase c) -> severityRank(c.getSeverity()))
                    .thenComparing(AnomalyCase::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(c -> new AnomalyDto(
                    c.getId().toString(),
                    c.getSeverity(),
                    c.getTitle(),
                    c.getDetails() == null ? "" : c.getDetails()))
                .toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    public List<String> alerts(String role) {
        setTenantConfig();
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        try {
            String bucket = roleBucket(role);
            switch (bucket) {
                case "CEO" -> buildCeoAlerts(tenantId, out);
                case "CFO" -> buildCfoAlerts(tenantId, out);
                case "SALES" -> buildSalesAlerts(tenantId, out);
                case "OPERATIONS" -> buildOperationsAlerts(tenantId, out);
                case "ACCOUNTING" -> buildAccountingAlerts(tenantId, out);
                case "HR" -> buildHrAlerts(tenantId, out);
                case "MARKETING" -> buildMarketingAlerts(tenantId, out);
                default -> { }
            }
            out.sort((a, b) -> {
                boolean aCrit = a.toLowerCase(Locale.ROOT).contains("critical")
                    || a.toLowerCase(Locale.ROOT).contains("90+");
                boolean bCrit = b.toLowerCase(Locale.ROOT).contains("critical")
                    || b.toLowerCase(Locale.ROOT).contains("90+");
                int pri = Boolean.compare(bCrit, aCrit);
                if (pri != 0) {
                    return pri;
                }
                return a.compareToIgnoreCase(b);
            });
            return out;
        } catch (Exception ex) {
            return List.of();
        }
    }

    public List<RecommendedActionDto> actions(String role) {
        setTenantConfig();
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            return List.of();
        }
        List<RecommendedActionDto> out = new ArrayList<>();
        try {
            String bucket = roleBucket(role);
            switch (bucket) {
                case "CEO" -> buildCeoActions(tenantId, out);
                case "CFO" -> buildCfoActions(tenantId, out);
                case "SALES" -> buildSalesActions(tenantId, out);
                case "OPERATIONS" -> buildOperationsActions(tenantId, out);
                case "ACCOUNTING" -> buildAccountingActions(tenantId, out);
                case "HR" -> buildHrActions(tenantId, out);
                case "MARKETING" -> buildMarketingActions(tenantId, out);
                default -> { }
            }
            return out;
        } catch (Exception ex) {
            return List.of();
        }
    }

    public String executeAction(String type, String actionId) {
        auditService.logAction("APPROVE_ACTION", "DASHBOARD_ACTION", "{}", "{\"type\":\"" + type + "\",\"actionId\":\"" + actionId + "\"}");
        actionQueueService.enqueue(type, actionId, "{\"source\":\"dashboard\"}");
        return "Action queued for workflow execution: " + actionId;
    }

    private static String roleBucket(String role) {
        if (role == null) {
            return "UNKNOWN";
        }
        return switch (role.toLowerCase(Locale.ROOT)) {
            case "cfo" -> "CFO";
            case "sales" -> "SALES";
            case "operations" -> "OPERATIONS";
            case "accounting" -> "ACCOUNTING";
            case "hr" -> "HR";
            case "marketing" -> "MARKETING";
            case "ceo" -> "CEO";
            default -> "UNKNOWN";
        };
    }

    private static int severityRank(String severity) {
        if (severity == null) {
            return 9;
        }
        return switch (severity.toUpperCase(Locale.ROOT)) {
            case "CRITICAL" -> 0;
            case "HIGH" -> 1;
            case "MEDIUM" -> 2;
            case "LOW" -> 3;
            default -> 9;
        };
    }

    private static String anomalyCategory(AnomalyCase c) {
        String kn = c.getKpiName() == null ? "" : c.getKpiName().trim().toUpperCase(Locale.ROOT).replace(' ', '_');
        if (!kn.isEmpty()) {
            if (kn.contains("CASH") || kn.contains("RUNWAY")) {
                return "CASH_VARIANCE";
            }
            if (kn.contains("MARGIN")) {
                return "MARGIN_DROP";
            }
            if (kn.contains("JOURNAL")) {
                return "JOURNAL_QUALITY";
            }
            if (kn.contains("PAYMENT")) {
                return "PAYMENT_PATTERN";
            }
            if (kn.contains("AR") || kn.contains("RECEIVABLE") || kn.contains("DSO")) {
                return "AR_SPIKE";
            }
            if (kn.contains("AP") || kn.contains("PAYABLE")) {
                return "AP_SPIKE";
            }
            if (kn.contains("FX")) {
                return "FX_EXPOSURE";
            }
            if (kn.contains("INVENTORY_COST")) {
                return "INVENTORY_COST";
            }
            if (kn.contains("COGS") && kn.contains("VARIANCE")) {
                return "COGS_VARIANCE";
            }
            if (kn.contains("INVENTORY") || kn.contains("STOCK")) {
                return "STOCK_GAP";
            }
            if (kn.contains("SUPPLIER") || kn.contains("COGS")) {
                return "SUPPLIER_COST_SPIKE";
            }
            if (kn.contains("RECON")) {
                return "RECONCILIATION";
            }
            if (kn.contains("TILL")) {
                return "TILL_VARIANCE";
            }
            if (kn.contains("MOMO") || kn.contains("MOBILE")) {
                return "MOMO_UNMATCHED";
            }
            if (kn.contains("PAYROLL")) {
                return "PAYROLL_VARIANCE";
            }
            if (kn.contains("HEADCOUNT") || kn.contains("ATTRITION")) {
                return "HEADCOUNT_COST";
            }
            if (kn.contains("CAC")) {
                return "CAC_SPIKE";
            }
            if (kn.contains("LTV")) {
                return "LTV_DROP";
            }
            if (kn.contains("ROI") || kn.contains("CAMPAIGN")) {
                return "ROI_VARIANCE";
            }
            if (kn.contains("CHURN")) {
                return "CHURN_SIGNAL";
            }
            if (kn.contains("CUSTOMER_CREDIT") || kn.contains("CUSTOMER")) {
                return "CUSTOMER_CREDIT";
            }
            if (kn.contains("CREDIT")) {
                return "CUSTOMER_CREDIT";
            }
            return kn;
        }
        String t = c.getTitle() == null ? "" : c.getTitle().toUpperCase(Locale.ROOT);
        if (t.contains("CASH") || t.contains("RUNWAY")) {
            return "CASH_VARIANCE";
        }
        if (t.contains("MARGIN")) {
            return "MARGIN_DROP";
        }
        if (t.contains("AR ") || t.contains(" RECEIVABLE")) {
            return "AR_SPIKE";
        }
        if (t.contains("SUPPLIER") || t.contains("COGS")) {
            return "SUPPLIER_COST_SPIKE";
        }
        return "UNKNOWN";
    }

    /**
     * Categories derived from {@link #anomalyCategory(AnomalyCase)}. {@code null} means no filter (CEO sees all open cases).
     */
    private static Set<String> allowedAnomalyCategories(String role) {
        return switch (roleBucket(role)) {
            case "CEO" -> null;
            case "CFO" -> Set.of(
                "JOURNAL_QUALITY", "CASH_VARIANCE", "FX_EXPOSURE", "AR_SPIKE", "AP_SPIKE", "MARGIN_DROP");
            case "SALES" -> Set.of("AR_SPIKE", "PAYMENT_PATTERN", "CHURN_SIGNAL", "CUSTOMER_CREDIT");
            case "OPERATIONS" -> Set.of("INVENTORY_COST", "SUPPLIER_COST_SPIKE", "STOCK_GAP", "COGS_VARIANCE");
            case "ACCOUNTING" -> Set.of("RECONCILIATION", "TILL_VARIANCE", "JOURNAL_QUALITY", "MOMO_UNMATCHED");
            case "HR" -> Set.of("PAYROLL_VARIANCE", "HEADCOUNT_COST");
            case "MARKETING" -> Set.of();
            default -> Set.of();
        };
    }

    private static void addAlert(List<String> out, String message, String routeOrApi) {
        if (routeOrApi == null || routeOrApi.isBlank()) {
            out.add(message);
            return;
        }
        if (routeOrApi.startsWith("/api/")) {
            out.add(message + " | api:" + routeOrApi);
        } else {
            out.add(message + " | route:" + routeOrApi);
        }
    }

    private void buildCeoAlerts(UUID tenantId, List<String> out) {
        long runway = cfoKpiProjector.getCashRunwayDays(tenantId);
        if (runway < 60) {
            addAlert(out, "Cash runway is " + runway + " days — review payment schedule", "/finance/supplier-bills");
        }
        double marginDrop = cfoKpiProjector.getMarginDropVsLastMonth(tenantId);
        if (marginDrop > 0.05d) {
            addAlert(out, "Gross margin dropped "
                + String.format(Locale.ROOT, "%.1f%%", marginDrop * 100d)
                + " vs last month — review COGS and pricing", "/dashboards/cfo");
        }
        long criticalAnomalies = anomalyCaseRepository.countByTenantIdAndStatusInAndSeverity(tenantId, ANOMALY_OPEN, "CRITICAL");
        if (criticalAnomalies > 0) {
            addAlert(out, criticalAnomalies + " critical anomalies need your attention", "/anomaly/cases");
        }
        long overdueReceivables = invoiceRepository.countByTenantIdAndStatusAndDueDateBeforeAndDeletedAtIsNull(
            tenantId, "OPEN", LocalDate.now().minusDays(30));
        if (overdueReceivables > 0) {
            addAlert(out, overdueReceivables + " customers are 30+ days overdue", "/finance/credit-ledger");
        }
    }

    private void buildCfoAlerts(UUID tenantId, List<String> out) {
        double dso = cfoKpiProjector.getDso(tenantId);
        if (dso > 45d) {
            addAlert(out, "DSO is " + String.format(Locale.ROOT, "%.0f", dso) + " days — above 45 day target", "/finance/credit-ledger");
        }
        long unmatched = reconciliationMatchingService.getUnmatchedCount(tenantId);
        if (unmatched > 0) {
            addAlert(out, unmatched + " unmatched reconciliation items before close", "/finance/supplier-bills");
        }
        long overdueSuppliers = supplierBillRepository.countByTenantIdAndStatusAndDueDateBeforeAndDeletedAtIsNull(
            tenantId, "POSTED", LocalDate.now());
        if (overdueSuppliers > 0) {
            addAlert(out, overdueSuppliers + " supplier bills are overdue", "/finance/supplier-bills");
        }
        long openCloseTasks = closeWorkflowService.getOpenTaskCount(tenantId);
        if (openCloseTasks > 0) {
            addAlert(out, openCloseTasks + " month-end close tasks still open", "/accounting/close");
        }
        addBankReconciliationAlerts(tenantId, out);
        addEbmComplianceAlerts(tenantId, out);
    }

    private void buildSalesAlerts(UUID tenantId, List<String> out) {
        long criticalDebtors = invoiceRepository.countByTenantIdAndStatusAndDueDateBeforeAndDeletedAtIsNull(
            tenantId, "OPEN", LocalDate.now().minusDays(90));
        if (criticalDebtors > 0) {
            addAlert(out, criticalDebtors + " customers are 90+ days overdue — escalate now", "/finance/credit-ledger");
        }
        double revenueVsTarget = salesKpiProjector.getRevenueVsTarget(tenantId);
        if (revenueVsTarget > 0d && revenueVsTarget < 0.85d) {
            addAlert(out, "Revenue is " + String.format(Locale.ROOT, "%.0f%%", revenueVsTarget * 100d)
                + " of target — review pipeline", "/dashboards/sales");
        }
        long unmatchedAr = invoiceRepository.countByTenantIdAndStatusAndDueDateBeforeAndDeletedAtIsNull(
            tenantId, "OPEN", LocalDate.now().minusDays(60));
        if (unmatchedAr > 0) {
            addAlert(out, unmatchedAr + " invoices 60+ days overdue need follow-up", "/finance/credit-ledger");
        }
        try {
            var lostSales = salesAnalyticsService.getLostSalesSummary(
                tenantId.toString(),
                LocalDate.now().minusDays(7),
                LocalDate.now());
            if (lostSales.totalLostRevenue().compareTo(BigDecimal.ZERO) > 0) {
                addAlert(out, "Estimated "
                    + lostSales.totalLostRevenue().toPlainString()
                    + " FRW lost to out-of-stock this week",
                    "/sales/analytics/lost-sales");
            }
        } catch (Exception ignored) {
        }
    }

    private void buildOperationsAlerts(UUID tenantId, List<String> out) {
        long lowStock = inventoryService.getLowStockCount(tenantId);
        if (lowStock > 0) {
            addAlert(out, lowStock + " products below reorder point", "/inventory/low-stock");
        }
        long expiring = inventoryService.getExpiringCount(tenantId, 7);
        if (expiring > 0) {
            addAlert(out, expiring + " batches expiring within 7 days — create markdown promotions", "/api/v1/inventory/expiry-markdown");
        }
        try {
            Long shrinkageWeek = jdbcTemplate.queryForObject(
                """
                select count(*) from shrinkage_records
                where tenant_id = ?::uuid and incident_date >= current_date - interval '7 days'
                """,
                Long.class,
                tenantId.toString());
            if (shrinkageWeek != null && shrinkageWeek > 0) {
                addAlert(out, shrinkageWeek + " shrinkage incidents this week need review", "/inventory/shrinkage");
            }
        } catch (Exception ignored) {
        }
        anomalyCaseRepository.findByTenantIdAndStatusInOrderByCreatedAtDesc(tenantId, ANOMALY_OPEN).stream()
            .filter(a -> "SUPPLIER_COST_SPIKE".equals(anomalyCategory(a)))
            .limit(3)
            .forEach(a -> {
                String d = a.getDetails() == null || a.getDetails().isBlank() ? a.getTitle() : a.getDetails();
                addAlert(out, "Supplier cost spike detected: " + d, "/finance/supplier-bills");
            });
    }

    private void buildAccountingAlerts(UUID tenantId, List<String> out) {
        long tillVariances = tillService.getVarianceCount(tenantId);
        if (tillVariances > 0) {
            addAlert(out, tillVariances + " till variances need investigation", "/retail/till");
        }
        long unmatchedMoMo = reconciliationMatchingService.getUnmatchedMoMoCount(tenantId);
        if (unmatchedMoMo > 0) {
            addAlert(out, unmatchedMoMo + " MoMo payments unmatched — reconcile before close", "/finance/reconciliation");
        }
        long openTasks = closeWorkflowService.getOpenTaskCount(tenantId);
        if (openTasks > 0) {
            addAlert(out, openTasks + " month-end tasks still open", "/accounting/close");
        }
        long journalFlags = anomalyCaseRepository.findByTenantIdAndStatusInOrderByCreatedAtDesc(tenantId, ANOMALY_OPEN).stream()
            .filter(a -> "JOURNAL_QUALITY".equals(anomalyCategory(a)))
            .count();
        if (journalFlags > 0) {
            addAlert(out, journalFlags + " journal entries flagged for review", "/finance/journal-entries");
        }
        addBankReconciliationAlerts(tenantId, out);
        addEbmComplianceAlerts(tenantId, out);
    }

    private void buildHrAlerts(UUID tenantId, List<String> out) {
        try {
            Integer n = jdbcTemplate.queryForObject(
                "select count(*)::int from hr_leave_requests where tenant_id = ?::uuid and upper(status) = 'PENDING'",
                Integer.class,
                tenantId.toString()
            );
            if (n != null && n > 0) {
                addAlert(out, n + " leave requests pending approval", "/hr/leave");
            }
        } catch (Exception ignored) {
        }
        int payrollDueDays = hrService.getPayrollDueInDays(tenantId);
        String currentPeriod = YearMonth.now().toString();
        if (payrollDueDays <= 5) {
            boolean runExists = payrollRunRepository.existsByTenantIdAndPeriodAndStatusIn(
                tenantId, currentPeriod, List.of("DRAFT", "REVIEW", "APPROVED", "POSTED", "PAID"));
            if (!runExists) {
                addAlert(out, "Payroll for " + currentPeriod
                    + " not started — due in " + payrollDueDays + " days", "/hr/payroll");
            }
        }
        long missingAttendance = hrService.countActiveByTenantId(tenantId)
            - attendanceCountToday(tenantId);
        if (missingAttendance > 0) {
            addAlert(out, missingAttendance + " employees have no attendance record today", "/hr/attendance");
        }
    }

    private long attendanceCountToday(UUID tenantId) {
        try {
            Long n = jdbcTemplate.queryForObject(
                "select count(distinct employee_id) from attendance_records where tenant_id = ? and attendance_date = current_date",
                Long.class,
                tenantId);
            return n == null ? 0L : n;
        } catch (Exception ex) {
            return 0L;
        }
    }

    private void addBankReconciliationAlerts(UUID tenantId, List<String> out) {
        long unmatchedBankLines = bankStatementLineRepository.countByTenantIdAndStatus(tenantId, "UNMATCHED");
        if (unmatchedBankLines > 0) {
            addAlert(out, unmatchedBankLines
                + " bank statement lines unmatched — reconcile before close", "/finance/bank-accounts");
        }
    }

    private void addEbmComplianceAlerts(UUID tenantId, List<String> out) {
        try {
            EbmComplianceReport ebmReport = ebmService.getComplianceReport(
                tenantId.toString(), YearMonth.now().toString());
            if (!ebmReport.isCompliant()) {
                addAlert(out, "EBM coverage is "
                    + String.format(Locale.ROOT, "%.1f%%", ebmReport.coverageRate())
                    + " — below 99% compliance threshold. "
                    + ebmReport.failedSubmissions() + " failed submissions", "/compliance/ebm");
            }
            if (ebmReport.pendingSubmissions() > 10) {
                addAlert(out, ebmReport.pendingSubmissions()
                    + " EBM receipts pending submission", "/compliance/ebm");
            }
        } catch (Exception ignored) {
        }
    }

    private int safePayrollDueDays(UUID tenantId) {
        return hrService.getPayrollDueInDays(tenantId);
    }

    private void buildMarketingAlerts(UUID tenantId, List<String> out) {
        try {
            Double roi = jdbcTemplate.query(
                """
                select (payload::jsonb->>'roiThisMonth')::float8 from marketing_roi_snapshot
                where tenant_id = ?::uuid and snapshot_date = current_date
                """,
                rs -> rs.next() ? (Double) rs.getObject(1) : null,
                tenantId.toString());
            if (roi != null && roi < 1.0d) {
                addAlert(out, "Marketing ROI is " + String.format(Locale.ROOT, "%.1fx", roi) + " — below breakeven", "/dashboards/marketing");
            }
        } catch (Exception ignored) {
        }
    }

    private static void recommend(List<RecommendedActionDto> out, String id, String type, String title, String description,
                                  String impactLevel, String routeOrApi) {
        String label = description == null || description.isBlank() ? title : title + " — " + description;
        String impact;
        if (routeOrApi == null || routeOrApi.isBlank()) {
            impact = impactLevel;
        } else if (routeOrApi.startsWith("/api/")) {
            impact = impactLevel + " | api:" + routeOrApi;
        } else {
            impact = impactLevel + " | route:" + routeOrApi;
        }
        out.add(new RecommendedActionDto(id, type, label, impact));
    }

    private void buildCeoActions(UUID tenantId, List<RecommendedActionDto> out) {
        long runway = cfoKpiProjector.getCashRunwayDays(tenantId);
        if (runway < 60) {
            recommend(out, "delay-supplier-payments", "APPROVE",
                "Delay non-critical supplier payments",
                "Extending payment terms by 15 days on eligible suppliers improves cash runway while monitoring supplier relationships.",
                "HIGH",
                "/finance/supplier-bills");
        }
        long critical = anomalyCaseRepository.countByTenantIdAndStatusInAndSeverity(tenantId, ANOMALY_OPEN, "CRITICAL");
        if (critical > 0) {
            recommend(out, "review-anomalies", "REVIEW",
                "Review " + critical + " critical anomalies",
                "Critical anomalies detected across financial and operational data that require CEO sign-off.",
                "CRITICAL",
                "/anomaly/cases");
        }
    }

    private void buildCfoActions(UUID tenantId, List<RecommendedActionDto> out) {
        long unmatched = reconciliationMatchingService.getUnmatchedCount(tenantId);
        if (unmatched > 0) {
            recommend(out, "auto-match-reconciliations", "EXECUTE",
                "Run auto-match on " + unmatched + " open items",
                "Auto-matching will resolve items where reference numbers align — remaining items need manual review.",
                "HIGH",
                "/api/v1/accounting/reconciliation/auto-match");
        }
        long openTasks = closeWorkflowService.getOpenTaskCount(tenantId);
        if (openTasks > 0) {
            recommend(out, "complete-close-tasks", "REVIEW",
                "Complete " + openTasks + " month-end close tasks",
                "Month-end close cannot complete until all tasks are resolved. Critical path available.",
                "HIGH",
                "/accounting/close");
        }
        double dso = cfoKpiProjector.getDso(tenantId);
        if (dso > 45d) {
            recommend(out, "chase-overdue-ar", "REVIEW",
                "Chase top overdue receivables",
                "DSO is " + String.format(Locale.ROOT, "%.0f", dso) + " days. Focus on largest past-due balances in the credit ledger.",
                "HIGH",
                "/finance/credit-ledger");
        }
        long suggestedBankMatches = bankStatementLineRepository.countByTenantIdAndStatus(tenantId, "SUGGESTED");
        if (suggestedBankMatches > 0) {
            recommend(out, "cfo-confirm-bank-matches", "REVIEW",
                "Confirm " + suggestedBankMatches + " suggested bank matches",
                "Auto-match found likely journal entries — confirm to close bank reconciliation gaps.",
                "HIGH",
                "/finance/bank-accounts");
        }
    }

    private void buildSalesActions(UUID tenantId, List<RecommendedActionDto> out) {
        List<Invoice> overdue = invoiceRepository.findByTenantIdAndStatusAndDueDateBeforeAndDeletedAtIsNull(
            tenantId, "OPEN", LocalDate.now().minusDays(60), PageRequest.of(0, 3));
        for (Invoice inv : overdue) {
            long days = ChronoUnit.DAYS.between(inv.getDueDate(), LocalDate.now());
            recommend(out, "remind-" + inv.getId(), "EXECUTE",
                "Send reminder to " + inv.getCustomerName(),
                "Outstanding: " + inv.getAmount().toPlainString() + " " + inv.getCurrencyCode() + " — " + days + " days overdue",
                "HIGH",
                "/api/v1/admin/jobs/sms-reminder/run");
        }
        try {
            var lostSales = salesAnalyticsService.getLostSalesSummary(
                tenantId.toString(), LocalDate.now().minusDays(7), LocalDate.now());
            if (lostSales.totalLostRevenue().compareTo(BigDecimal.ZERO) > 0) {
                recommend(out, "review-lost-sales", "REVIEW",
                    "Review lost sales (" + lostSales.totalLostRevenue().toPlainString() + " FRW)",
                    lostSales.occurrenceCount() + " out-of-stock attempts this week — restock or adjust assortment.",
                    "HIGH",
                    "/sales/analytics/lost-sales");
            }
            salesAnalyticsService.getCashierPerformance(
                tenantId.toString(), LocalDate.now(), LocalDate.now()).stream()
                .findFirst()
                .ifPresent(top -> recommend(out, "review-cashier-performance", "REVIEW",
                    "Review cashier performance",
                    top.cashierName() + " led today with "
                        + top.transactionCount() + " transactions ("
                        + top.totalSales().toPlainString() + " FRW).",
                    "MEDIUM",
                    "/sales/analytics/cashiers"));
        } catch (Exception ignored) {
        }
    }

    private void buildOperationsActions(UUID tenantId, List<RecommendedActionDto> out) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                select ib.product_id::text as pid, coalesce(p.name, ib.product_id::text) as pname, ib.quantity as qty
                from inventory_balances ib
                left join products p on p.id = ib.product_id and p.tenant_id = ib.tenant_id
                where ib.tenant_id = ?::uuid and ib.location_code = 'SHOP' and ib.quantity <= 10
                order by ib.quantity asc
                limit 3
                """,
                tenantId.toString());
            for (Map<String, Object> row : rows) {
                String pid = String.valueOf(row.get("pid"));
                recommend(out, "reorder-" + pid, "REVIEW",
                    "Reorder " + row.get("pname"),
                    "Low stock at SHOP — current quantity " + row.get("qty") + " units.",
                    "HIGH",
                    "/procurement/purchase-orders");
            }
        } catch (Exception ignored) {
        }
        try {
            List<Map<String, Object>> expRows = jdbcTemplate.queryForList(
                """
                select b.product_id::text as pid, coalesce(p.name, b.product_id::text) as pname,
                       b.quantity_on_hand as qty, b.expiry_date::text as exp
                from inventory_batches b
                left join products p on p.id = b.product_id and p.tenant_id = b.tenant_id
                where b.tenant_id = ?::uuid and b.location_code = 'SHOP'
                  and b.quantity_on_hand > 0 and b.expiry_date is not null
                  and b.expiry_date between current_date and current_date + interval '7 day'
                order by b.expiry_date asc
                limit 2
                """,
                tenantId.toString());
            for (Map<String, Object> row : expRows) {
                String pid = String.valueOf(row.get("pid"));
                recommend(out, "handle-expiry-" + pid, "EXECUTE",
                    "Create expiry markdown for " + row.get("pname"),
                    row.get("qty") + " units expire on " + row.get("exp") + " — auto-create short-lived promotions",
                    "HIGH",
                    "/api/v1/inventory/expiry-markdown");
            }
        } catch (Exception ignored) {
        }
        try {
            inventoryService.getLowStockItems(tenantId.toString()).stream()
                .filter(item -> item.daysOfStockRemaining() <= 3)
                .limit(3)
                .forEach(item -> recommend(out, "create-po-" + item.productId(), "EXECUTE",
                    "Create PO for " + item.productName(),
                    "Only " + item.daysOfStockRemaining() + " days of stock remaining. Suggested order: "
                        + item.suggestedOrderQuantity() + " units",
                    "CRITICAL",
                    "/api/v1/procurement/purchase-orders/from-low-stock/" + item.productId()));
        } catch (Exception ignored) {
        }
        try {
            Long shrinkageWeek = jdbcTemplate.queryForObject(
                """
                select count(*) from shrinkage_records
                where tenant_id = ?::uuid and incident_date >= current_date - interval '7 days'
                """,
                Long.class,
                tenantId.toString());
            if (shrinkageWeek != null && shrinkageWeek > 0) {
                recommend(out, "review-shrinkage", "REVIEW",
                    "Review " + shrinkageWeek + " shrinkage incidents",
                    "Shrinkage recorded in the last 7 days — verify counts and write-offs.",
                    "HIGH",
                    "/inventory/shrinkage");
            }
        } catch (Exception ignored) {
        }
    }

    private void buildAccountingActions(UUID tenantId, List<RecommendedActionDto> out) {
        long unmatchedMoMo = reconciliationMatchingService.getUnmatchedMoMoCount(tenantId);
        if (unmatchedMoMo > 0) {
            recommend(out, "clear-momo", "REVIEW",
                "Clear " + unmatchedMoMo + " unmatched MoMo payments",
                "Unmatched payments block accurate cash reconciliation and daily close.",
                "HIGH",
                "/finance/reconciliation");
        }
        long tillVariances = tillService.getVarianceCount(tenantId);
        if (tillVariances > 0) {
            recommend(out, "investigate-till-variance", "REVIEW",
                "Investigate " + tillVariances + " till variances",
                "Till variance detected — investigate before the next shift opens.",
                "HIGH",
                "/retail/till");
        }
        long suggestedMatches = bankStatementLineRepository.countByTenantIdAndStatus(tenantId, "SUGGESTED");
        if (suggestedMatches > 0) {
            recommend(out, "confirm-bank-matches", "REVIEW",
                "Confirm " + suggestedMatches + " suggested bank matches",
                "Auto-match found likely matches — confirm to complete reconciliation",
                "HIGH",
                "/finance/bank-accounts");
        }
    }

    private void buildHrActions(UUID tenantId, List<RecommendedActionDto> out) {
        String currentPeriod = YearMonth.now().toString();
        boolean payrollRunExists = payrollRunRepository.existsByTenantIdAndPeriodAndStatusIn(
            tenantId, currentPeriod, List.of("DRAFT", "REVIEW", "APPROVED", "POSTED", "PAID"));
        int payrollDueDays = hrService.getPayrollDueInDays(tenantId);
        if (!payrollRunExists && payrollDueDays <= 10) {
            recommend(out, "prepare-payroll-" + currentPeriod, "EXECUTE",
                "Prepare " + currentPeriod + " payroll",
                "Payroll due in " + payrollDueDays + " days. "
                    + hrService.countActiveByTenantId(tenantId) + " employees to process.",
                "HIGH",
                "/api/v1/hr/payroll/runs");
        }
    }

    private void buildMarketingActions(UUID tenantId, List<RecommendedActionDto> out) {
        try {
            Long activePromos = jdbcTemplate.queryForObject(
                """
                select count(*) from promotions
                where tenant_id = ?::uuid and upper(status) = 'ACTIVE' and deleted_at is null
                """,
                Long.class,
                tenantId.toString());
            if (activePromos != null && activePromos > 0) {
                recommend(out, "review-active-promotions", "REVIEW",
                    "Review " + activePromos + " active promotions",
                    "Confirm dates, discount limits, and product scope before peak trading.",
                    "MEDIUM",
                    "/promotions");
            }
            long expiring = inventoryService.getExpiringCount(tenantId, 7);
            if (expiring > 0) {
                recommend(out, "expiry-markdown-campaign", "EXECUTE",
                    "Launch expiry markdown campaign",
                    expiring + " batches expiring within 7 days — create auto-markdown promotions.",
                    "HIGH",
                    "/api/v1/inventory/expiry-markdown");
            }
        } catch (Exception ignored) {
        }
    }

    private void setTenantConfig() {
        if (TenantContext.tenantId() != null) {
            try {
                jdbcTemplate.queryForObject(
                    "select set_config('app.tenant_id', ?, true)",
                    String.class,
                    TenantContext.tenantId().toString()
                );
            } catch (Exception ex) {
                // H2 and other non-Postgres databases do not support set_config.
            }
        }
    }

    private Optional<String> arAgingPayload(UUID tenantId) {
        try {
            return jdbcTemplate.query(
                """
                select receivable_current, receivable_30, receivable_60, receivable_90_plus
                from ar_ap_aging_snapshot
                where tenant_id = ? and snapshot_date = current_date
                """,
                rs -> {
                    if (!rs.next()) {
                        return Optional.<String>empty();
                    }
                    BigDecimal bucket0to30 = rs.getBigDecimal("receivable_current").add(rs.getBigDecimal("receivable_30"));
                    BigDecimal bucket31to60 = rs.getBigDecimal("receivable_60");
                    BigDecimal bucket91plus = rs.getBigDecimal("receivable_90_plus");
                    return Optional.of("{\"bucket0to30\":" + bucket0to30.toPlainString()
                        + ",\"bucket31to60\":" + bucket31to60.toPlainString()
                        + ",\"bucket91plus\":" + bucket91plus.toPlainString()
                        + ",\"snapshotDate\":\"" + LocalDate.now() + "\"}");
                },
                tenantId
            );
        } catch (Exception ex) {
            try {
                return jdbcTemplate.query(
                    """
                    select receivable_current, receivable_30, receivable_60, receivable_90_plus
                    from ar_ap_aging_snapshot
                    where tenant_id = ? and snapshot_date = current_date
                    """,
                    rs -> {
                        if (!rs.next()) {
                            return Optional.<String>empty();
                        }
                        BigDecimal bucket0to30 = rs.getBigDecimal("receivable_current").add(rs.getBigDecimal("receivable_30"));
                        BigDecimal bucket31to60 = rs.getBigDecimal("receivable_60");
                        BigDecimal bucket91plus = rs.getBigDecimal("receivable_90_plus");
                        return Optional.of("{\"bucket0to30\":" + bucket0to30.toPlainString()
                            + ",\"bucket31to60\":" + bucket31to60.toPlainString()
                            + ",\"bucket91plus\":" + bucket91plus.toPlainString()
                            + ",\"snapshotDate\":\"" + LocalDate.now() + "\"}");
                    },
                    tenantId.toString()
                );
            } catch (Exception ignored) {
                return Optional.empty();
            }
        }
    }

    private List<KpiDto> tenantDefaultKpis(UUID tenantId) {
        BigDecimal growth = revenueGrowthPct(tenantId, 30, 30);
        String growthStr = formatPercent(growth, 1);
        String growthTrend = formatSignedPercent(growth);
        String runway = cashRunwayProxyDays(tenantId);
        String accuracy = revenueStabilityScore(tenantId);
        String gStatus = growth.compareTo(BigDecimal.ZERO) >= 0 ? "GREEN" : "AMBER";
        return List.of(
            new KpiDto("revenue_growth", "Revenue Growth", growthStr, growthTrend, gStatus),
            new KpiDto("cash_runway", "Cash Runway", runway, "-4 days", "AMBER"),
            new KpiDto("forecast_accuracy", "Forecast Accuracy", accuracy, "+2%", "GREEN")
        );
    }

    private BigDecimal revenueGrowthPct(UUID tenantId, int recentDays, int priorDays) {
        try {
            LocalDate end = LocalDate.now();
            LocalDate curFrom = end.minusDays(Math.max(0, recentDays - 1));
            BigDecimal cur = sumPaidInvoicesBetweenInclusive(tenantId, curFrom, end);
            LocalDate prevTo = curFrom.minusDays(1);
            LocalDate prevFrom = prevTo.minusDays(Math.max(0, priorDays - 1));
            BigDecimal prev = sumPaidInvoicesBetweenInclusive(tenantId, prevFrom, prevTo);
            if (prev.compareTo(BigDecimal.ZERO) == 0) {
                return BigDecimal.ZERO;
            }
            return cur.subtract(prev).multiply(BigDecimal.valueOf(100)).divide(prev, 2, RoundingMode.HALF_UP);
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal sumPaidInvoicesBetweenInclusive(UUID tenantId, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            return BigDecimal.ZERO;
        }
        String sql = """
            select coalesce(sum(amount), 0)
            from invoices
            where tenant_id = ?::uuid and upper(status) = 'PAID'
              and (created_at at time zone 'UTC')::date between ?::date and ?::date
            """;
        return jdbcTemplate.queryForObject(sql, BigDecimal.class, tenantId.toString(), from, to);
    }

    private String cashRunwayProxyDays(UUID tenantId) {
        try {
            BigDecimal inbound = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(amount), 0) from payments
                where tenant_id = ?::uuid and upper(direction) = 'IN'
                  and (created_at at time zone 'UTC')::date >= current_date - 30
                """,
                BigDecimal.class,
                tenantId.toString()
            );
            BigDecimal outbound = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(amount), 0) from payments
                where tenant_id = ?::uuid and upper(direction) = 'OUT'
                  and (created_at at time zone 'UTC')::date >= current_date - 30
                """,
                BigDecimal.class,
                tenantId.toString()
            );
            BigDecimal dailyOut = outbound.divide(BigDecimal.valueOf(30), 4, RoundingMode.HALF_UP);
            if (dailyOut.compareTo(BigDecimal.ZERO) == 0) {
                return "N/A";
            }
            int days = inbound.divide(dailyOut, 0, RoundingMode.HALF_UP).intValue();
            return Math.min(Math.max(days, 0), 9999) + " days";
        } catch (Exception ex) {
            return "N/A";
        }
    }

    private String revenueStabilityScore(UUID tenantId) {
        try {
            LocalDate end = LocalDate.now();
            BigDecimal w1 = sumPaidInvoicesBetweenInclusive(tenantId, end.minusDays(6), end);
            BigDecimal w2 = sumPaidInvoicesBetweenInclusive(tenantId, end.minusDays(13), end.minusDays(7));
            if (w2.compareTo(BigDecimal.ZERO) == 0) {
                return "—";
            }
            BigDecimal vol = w1.subtract(w2).abs().multiply(BigDecimal.valueOf(100))
                .divide(w2.max(BigDecimal.ONE), 1, RoundingMode.HALF_UP);
            int score = BigDecimal.valueOf(100).subtract(vol.min(BigDecimal.valueOf(40))).intValue();
            return Math.min(99, Math.max(60, score)) + "%";
        } catch (Exception ex) {
            return "—";
        }
    }

    private BigDecimal invoicePaidSharePct(UUID tenantId, int lookbackDays) {
        try {
            return jdbcTemplate.queryForObject(
                """
                select case when count(*) = 0 then 0
                   else round(100.0 * count(*) filter (where upper(status) = 'PAID')::numeric / count(*), 2)
                   end
                from invoices
                where tenant_id = ?::uuid
                  and (created_at at time zone 'UTC')::date >= current_date - (?::int)
                """,
                BigDecimal.class,
                tenantId.toString(),
                lookbackDays
            );
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }

    private Optional<String> pipelineAvgCloseDays(UUID tenantId) {
        return queryOptionalString(
            "select payload->>'avgCloseDays' from sales_pipeline_snapshot where tenant_id = ?::uuid and snapshot_date = current_date",
            tenantId.toString()
        );
    }

    private String forecastAccuracyProxy(UUID tenantId) {
        return pipelineAvgCloseDays(tenantId).map(d -> d + "d pipeline").orElse("—");
    }

    private Optional<String> opsScalar(UUID tenantId, String table, String field) {
        return queryOptionalString(
            "select payload->>'" + field + "' from " + table + " where tenant_id = ?::uuid and snapshot_date = current_date",
            tenantId.toString()
        );
    }

    private Optional<String> hrScalar(UUID tenantId, String field) {
        return queryOptionalString(
            "select payload->>'" + field + "' from hr_workforce_snapshot where tenant_id = ?::uuid and snapshot_date = current_date",
            tenantId.toString()
        );
    }

    private int countActiveEmployees(UUID tenantId) {
        try {
            Integer n = jdbcTemplate.queryForObject(
                "select count(*)::int from hr_employee_profiles where tenant_id = ?::uuid and upper(status) = 'ACTIVE'",
                Integer.class,
                tenantId.toString()
            );
            return n == null ? 0 : n;
        } catch (Exception ex) {
            return 0;
        }
    }

    private String revenuePerEmployee(UUID tenantId, int headcount) {
        if (headcount <= 0) {
            return "—";
        }
        try {
            BigDecimal rev = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(amount), 0) from invoices
                where tenant_id = ?::uuid and upper(status) = 'PAID'
                  and (created_at at time zone 'UTC')::date >= current_date - 365
                """,
                BigDecimal.class,
                tenantId.toString()
            );
            BigDecimal per = rev.divide(BigDecimal.valueOf(headcount), 0, RoundingMode.HALF_UP);
            return per.toPlainString();
        } catch (Exception ex) {
            return "—";
        }
    }

    private Optional<String> marketingScalar(UUID tenantId, String field) {
        return queryOptionalString(
            "select payload->>'" + field + "' from marketing_roi_snapshot where tenant_id = ?::uuid and snapshot_date = current_date",
            tenantId.toString()
        );
    }

    private String marketingBlendedRoi(UUID tenantId) {
        try {
            Optional<String> ltv = marketingScalar(tenantId, "ltvFRW");
            Optional<String> cac = marketingScalar(tenantId, "cacFRW");
            if (ltv.isEmpty() || cac.isEmpty()) {
                return "—";
            }
            BigDecimal l = new BigDecimal(ltv.get());
            BigDecimal c = new BigDecimal(cac.get());
            if (c.compareTo(BigDecimal.ZERO) == 0) {
                return "—";
            }
            return formatDecimal(l.divide(c, 2, RoundingMode.HALF_UP), 2) + "x";
        } catch (Exception ex) {
            return "—";
        }
    }

    private String reconciliationOpenPct(UUID tenantId) {
        try {
            Integer open = jdbcTemplate.queryForObject(
                "select count(*)::int from reconciliations where tenant_id = ?::uuid and upper(status) <> 'COMPLETED'",
                Integer.class,
                tenantId.toString()
            );
            Integer total = jdbcTemplate.queryForObject(
                "select count(*)::int from reconciliations where tenant_id = ?::uuid",
                Integer.class,
                tenantId.toString()
            );
            if (total == null || total == 0) {
                return "—";
            }
            int o = open == null ? 0 : open;
            int closed = total - o;
            return formatDecimal(BigDecimal.valueOf(closed * 100L).divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP), 1) + "%";
        } catch (Exception ex) {
            return "—";
        }
    }

    private long openHighSeverityAnomalyCount(UUID tenantId) {
        try {
            Long n = jdbcTemplate.queryForObject(
                """
                select count(*) from anomaly_cases
                where tenant_id = ?::uuid and upper(status) = 'OPEN'
                  and upper(severity) in ('HIGH','CRITICAL')
                """,
                Long.class,
                tenantId.toString()
            );
            return n == null ? 0L : n;
        } catch (Exception ex) {
            return 0L;
        }
    }

    private long countJournalEntriesLastDays(UUID tenantId, int days) {
        try {
            Long n = jdbcTemplate.queryForObject(
                """
                select count(*) from journal_entries
                where tenant_id = ?::uuid and deleted_at is null
                  and entry_date >= current_date - (?::int)
                """,
                Long.class,
                tenantId.toString(),
                days
            );
            return n == null ? 0L : n;
        } catch (Exception ex) {
            return 0L;
        }
    }

    private String extractCeoScalar(UUID tenantId, String field, String suffix) {
        Optional<String> raw = queryOptionalString(
            "select payload->>'" + field + "' from ceo_kpi_snapshot where tenant_id = ?::uuid and snapshot_date = current_date",
            tenantId.toString()
        );
        if (raw.isEmpty()) {
            return null;
        }
        String v = raw.get();
        if ("%".equals(suffix)) {
            return formatMaybeNumber(v, 1) + "%";
        }
        if ("weeks".equals(suffix)) {
            return formatMaybeNumber(v, 0) + " weeks";
        }
        return v;
    }

    private Optional<String> queryOptionalString(String sql, Object... args) {
        try {
            List<String> rows = jdbcTemplate.query(sql, (rs, rn) -> rs.getString(1), args);
            if (rows.isEmpty() || rows.get(0) == null) {
                return Optional.empty();
            }
            return Optional.of(rows.get(0));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private static String formatMaybeNumber(String v, int scale) {
        try {
            return formatDecimal(new BigDecimal(v), scale);
        } catch (Exception ex) {
            return v;
        }
    }

    private static String formatDecimal(BigDecimal v, int scale) {
        return v.setScale(scale, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private static String formatPercent(BigDecimal v, int scale) {
        return formatDecimal(v, scale) + "%";
    }

    private static String formatSignedPercent(BigDecimal v) {
        String sign = v.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
        return sign + formatDecimal(v, 1) + "%";
    }

    private static String abbreviate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
