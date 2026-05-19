package com.smartaccounting.service;

import com.smartaccounting.entity.TillSession;
import com.smartaccounting.entity.ZReport;
import com.smartaccounting.exception.BusinessException;
import com.smartaccounting.repository.TillSessionRepository;
import com.smartaccounting.repository.ZReportRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ZReportService {
    private final TillSessionRepository tillSessionRepository;
    private final ZReportRepository zReportRepository;
    private final JdbcTemplate jdbcTemplate;

    public ZReportService(TillSessionRepository tillSessionRepository,
                          ZReportRepository zReportRepository,
                          JdbcTemplate jdbcTemplate) {
        this.tillSessionRepository = tillSessionRepository;
        this.zReportRepository = zReportRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> preview(UUID tillSessionId, String reportType, BigDecimal closingCash, String cashierName) {
        return buildPayload(tillSessionId, reportType, closingCash, cashierName, false);
    }

    @Transactional
    public Map<String, Object> saveZReport(UUID tillSessionId,
                                           String reportType,
                                           BigDecimal closingCash,
                                           String cashierName) {
        if ("Z".equalsIgnoreCase(reportType)) {
            zReportRepository
                .findFirstByTenantIdAndTillSessionIdAndReportTypeOrderByCreatedAtDesc(
                    requireTenant(), tillSessionId, "Z")
                .ifPresent(z -> {
                    throw new BusinessException("Z-report already issued for this session");
                });
        }
        return buildPayload(tillSessionId, reportType, closingCash, cashierName, true);
    }

    private Map<String, Object> buildPayload(UUID tillSessionId,
                                             String reportType,
                                             BigDecimal closingCash,
                                             String cashierName,
                                             boolean persist) {
        UUID tenant = requireTenant();
        TillSession session = tillSessionRepository.findByIdAndTenantId(tillSessionId, tenant)
            .orElseThrow(() -> new BusinessException("Till session not found"));
        String type = reportType == null ? "X" : reportType.trim().toUpperCase();

        Map<String, BigDecimal> tenders = sumTendersByType(tenant, session);
        BigDecimal totalVat = sumVat(tenant, session);
        BigDecimal totalDiscounts = sumDiscounts(tenant, session);
        BigDecimal totalReturns = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BigDecimal closing = closingCash != null
            ? closingCash.setScale(2, RoundingMode.HALF_UP)
            : session.getClosingCash();
        BigDecimal variance = closing != null && session.getOpeningFloat() != null
            ? closing.subtract(session.getOpeningFloat()).setScale(2, RoundingMode.HALF_UP)
            : null;

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("reportType", type);
        payload.put("tillSessionId", tillSessionId);
        payload.put("openingFloat", session.getOpeningFloat());
        payload.put("totalSalesCash", tenders.getOrDefault("CASH", BigDecimal.ZERO));
        payload.put("totalSalesMomo", tenders.getOrDefault("MOMO", BigDecimal.ZERO));
        payload.put("totalSalesAirtel", tenders.getOrDefault("AIRTEL_MONEY", BigDecimal.ZERO));
        payload.put("totalSalesCard", tenders.getOrDefault("CARD", BigDecimal.ZERO));
        payload.put("totalSalesOnAccount", tenders.getOrDefault("ON_ACCOUNT", BigDecimal.ZERO));
        payload.put("totalReturns", totalReturns);
        payload.put("totalDiscounts", totalDiscounts);
        payload.put("totalVatCollected", totalVat);
        payload.put("closingCash", closing);
        payload.put("variance", variance);
        payload.put("cashierName", cashierName);
        payload.put("registerName", session.getPosRegisterCode());
        payload.put("openedAt", session.getOpenedAt());
        payload.put("closedAt", session.getClosedAt());
        payload.put("generatedAt", Instant.now());

        if (persist) {
            ZReport row = new ZReport();
            row.setId(UUID.randomUUID());
            row.setTenantId(tenant);
            row.setTillSessionId(tillSessionId);
            row.setReportType(type);
            row.setOpeningFloat(session.getOpeningFloat());
            row.setTotalSalesCash(tenders.getOrDefault("CASH", BigDecimal.ZERO));
            row.setTotalSalesMomo(tenders.getOrDefault("MOMO", BigDecimal.ZERO));
            row.setTotalSalesAirtel(tenders.getOrDefault("AIRTEL_MONEY", BigDecimal.ZERO));
            row.setTotalSalesCard(tenders.getOrDefault("CARD", BigDecimal.ZERO));
            row.setTotalSalesOnAccount(tenders.getOrDefault("ON_ACCOUNT", BigDecimal.ZERO));
            row.setTotalReturns(totalReturns);
            row.setTotalDiscounts(totalDiscounts);
            row.setTotalVatCollected(totalVat);
            row.setClosingCash(closing);
            row.setVariance(variance);
            row.setCashierName(cashierName);
            row.setRegisterName(session.getPosRegisterCode());
            row.setPayloadJson(payload);
            row.setCreatedAt(Instant.now());
            zReportRepository.save(row);
            payload.put("zReportId", row.getId());
        }
        return payload;
    }

    private Map<String, BigDecimal> sumTendersByType(UUID tenant, TillSession session) {
        String sql = """
            SELECT t.tender_type, COALESCE(SUM(t.amount), 0) AS amt
            FROM pos_payment_tenders t
            JOIN sales_orders o ON o.id = t.sales_order_id
            WHERE o.tenant_id = ?
              AND o.sales_channel = 'POS'
              AND (
                o.till_session_id = ?
                OR (
                  o.till_session_id IS NULL
                  AND o.pos_register_code = ?
                  AND o.created_at >= ?
                  AND o.created_at < COALESCE(?, NOW())
                )
              )
            GROUP BY t.tender_type
            """;
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            sql,
            tenant,
            session.getId(),
            session.getPosRegisterCode(),
            session.getOpenedAt(),
            session.getClosedAt()
        );
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String tt = String.valueOf(row.get("tender_type"));
            BigDecimal amt = new BigDecimal(row.get("amt").toString());
            out.put(tt, amt.setScale(2, RoundingMode.HALF_UP));
        }
        return out;
    }

    private BigDecimal sumVat(UUID tenant, TillSession session) {
        String sql = """
            SELECT COALESCE(SUM(o.vat_amount), 0)
            FROM sales_orders o
            WHERE o.tenant_id = ?
              AND o.sales_channel = 'POS'
              AND (
                o.till_session_id = ?
                OR (
                  o.till_session_id IS NULL
                  AND o.pos_register_code = ?
                  AND o.created_at >= ?
                  AND o.created_at < COALESCE(?, NOW())
                )
              )
            """;
        BigDecimal v = jdbcTemplate.queryForObject(
            sql,
            BigDecimal.class,
            tenant,
            session.getId(),
            session.getPosRegisterCode(),
            session.getOpenedAt(),
            session.getClosedAt()
        );
        return v == null ? BigDecimal.ZERO : v.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal sumDiscounts(UUID tenant, TillSession session) {
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
