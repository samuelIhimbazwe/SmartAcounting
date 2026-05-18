package com.smartaccounting.service;

import com.smartaccounting.briefing.CfoKpiProjector;
import com.smartaccounting.briefing.SalesKpiProjector;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class BoardReportService {
    private final CfoKpiProjector cfoKpiProjector;
    private final SalesKpiProjector salesKpiProjector;
    private final BoardReportPdfGenerator boardReportPdfGenerator;
    private final JdbcTemplate jdbcTemplate;

    public BoardReportService(CfoKpiProjector cfoKpiProjector,
                              SalesKpiProjector salesKpiProjector,
                              BoardReportPdfGenerator boardReportPdfGenerator,
                              JdbcTemplate jdbcTemplate) {
        this.cfoKpiProjector = cfoKpiProjector;
        this.salesKpiProjector = salesKpiProjector;
        this.boardReportPdfGenerator = boardReportPdfGenerator;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public byte[] generateBoardReport(String period) {
        UUID tenantId = requireTenant();
        YearMonth ym = YearMonth.parse(period);
        Map<String, Object> vat = loadVatSummary(tenantId, ym);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("period", period);
        data.put("tenantName", resolveTenantName(tenantId));
        data.put("generatedAt", Instant.now());
        data.put("revenue", salesKpiProjector.getGrossRevenueFromSnapshot(tenantId));
        data.put("grossMargin", cfoKpiProjector.getMarginDropVsLastMonth(tenantId));
        data.put("cashPosition", cfoKpiProjector.getCashPosition(tenantId));
        data.put("dso", cfoKpiProjector.getDso(tenantId));
        data.put("dpo", cfoKpiProjector.getDpo(tenantId));
        data.put("revenueVsTarget", salesKpiProjector.getRevenueVsTarget(tenantId));
        data.put("topProduct", salesKpiProjector.getTopProduct(tenantId));
        data.put("vatOutput", vat.get("vatOutput"));
        data.put("vatInput", vat.get("vatInput"));
        data.put("vatPayable", vat.get("vatPayable"));

        return boardReportPdfGenerator.generate(data);
    }

    private Map<String, Object> loadVatSummary(UUID tenantId, YearMonth ym) {
        try {
            Map<String, Object> row = jdbcTemplate.queryForMap(
                """
                select
                  coalesce(sum(case when upper(entry_type) = 'OUTPUT' then tax_amount else 0 end), 0) as vat_output,
                  coalesce(sum(case when upper(entry_type) = 'INPUT' then tax_amount else 0 end), 0) as vat_input
                from tax_transactions
                where tenant_id = ?::uuid
                  and transaction_date >= ?::date
                  and transaction_date < ?::date
                """,
                tenantId.toString(),
                ym.atDay(1).toString(),
                ym.plusMonths(1).atDay(1).toString()
            );
            BigDecimal output = (BigDecimal) row.get("vat_output");
            BigDecimal input = (BigDecimal) row.get("vat_input");
            BigDecimal net = output.subtract(input);
            return Map.of(
                "vatOutput", output,
                "vatInput", input,
                "vatPayable", net
            );
        } catch (Exception ex) {
            return Map.of(
                "vatOutput", BigDecimal.ZERO,
                "vatInput", BigDecimal.ZERO,
                "vatPayable", BigDecimal.ZERO
            );
        }
    }

    private String resolveTenantName(UUID tenantId) {
        try {
            return jdbcTemplate.queryForObject(
                "select coalesce(display_name, name) from tenants where id = ?::uuid",
                String.class,
                tenantId.toString()
            );
        } catch (Exception ex) {
            return tenantId.toString();
        }
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
