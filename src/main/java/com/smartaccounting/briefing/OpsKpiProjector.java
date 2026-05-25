package com.smartaccounting.briefing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.repository.OpsKpiSnapshotJdbcRepository;
import com.smartaccounting.service.InventoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;

@Component
public class OpsKpiProjector {
    private static final Logger log = LoggerFactory.getLogger(OpsKpiProjector.class);

    private final OpsKpiSnapshotJdbcRepository opsKpiSnapshotJdbcRepository;
    private final ObjectMapper objectMapper;
    private final InventoryService inventoryService;
    private final JdbcTemplate jdbcTemplate;

    public OpsKpiProjector(
        OpsKpiSnapshotJdbcRepository opsKpiSnapshotJdbcRepository,
        ObjectMapper objectMapper,
        InventoryService inventoryService,
        JdbcTemplate jdbcTemplate
    ) {
        this.opsKpiSnapshotJdbcRepository = opsKpiSnapshotJdbcRepository;
        this.objectMapper = objectMapper;
        this.inventoryService = inventoryService;
        this.jdbcTemplate = jdbcTemplate;
    }

    public long getLowStockCount(UUID tenantId) {
        return inventoryService.getLowStockCount(tenantId);
    }

    /**
     * Best-effort label from ops KPI snapshot; if unavailable, logs WARN and returns {@code "0"} for numeric-safe briefing.
     */
    public String getTopCostDriver(UUID tenantId) {
        if (tenantId == null) {
            return "0";
        }
        try {
            Optional<String> ops = opsKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (ops.isEmpty()) {
                log.warn("getTopCostDriver stub for tenant {} — no ops_kpi_snapshot for today; returning 0", tenantId);
                return "0";
            }
            JsonNode n = objectMapper.readTree(ops.get());
            double spend = n.path("procurementSpend").asDouble(0);
            if (spend > 0) {
                return "procurementSpend=" + spend;
            }
            log.warn("getTopCostDriver stub for tenant {} — procurementSpend missing or zero in snapshot; returning 0", tenantId);
            return "0";
        } catch (Exception ex) {
            log.warn("getTopCostDriver stub for tenant {} — snapshot parse failed: {}; returning 0", tenantId, ex.getMessage());
            return "0";
        }
    }

    public double getInventoryTurnover(UUID tenantId) {
        if (tenantId == null) {
            return 0d;
        }
        try {
            BigDecimal cogs = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(psl.quantity * coalesce(psl.cost_price, 0)), 0)
                from pos_sale_lines psl
                join sales_orders so on so.id = psl.sales_order_id and so.tenant_id = psl.tenant_id
                where psl.tenant_id = ?
                  and so.created_at >= current_timestamp - interval '30 day'
                """,
                BigDecimal.class,
                tenantId
            );
            BigDecimal avgQty = jdbcTemplate.queryForObject(
                """
                select coalesce(nullif(avg(quantity), 0), 1)
                from inventory_balances where tenant_id = ?
                """,
                BigDecimal.class,
                tenantId
            );
            if (cogs == null || avgQty == null || avgQty.compareTo(BigDecimal.ZERO) == 0) {
                return 0d;
            }
            return cogs.divide(avgQty, 4, RoundingMode.HALF_UP).doubleValue();
        } catch (Exception ex) {
            log.debug("getInventoryTurnover failed for {}: {}", tenantId, ex.getMessage());
            return 0d;
        }
    }
}
