package com.smartaccounting.briefing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.repository.OpsKpiSnapshotJdbcRepository;
import com.smartaccounting.service.InventoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
public class OpsKpiProjector {
    private static final Logger log = LoggerFactory.getLogger(OpsKpiProjector.class);

    private final OpsKpiSnapshotJdbcRepository opsKpiSnapshotJdbcRepository;
    private final ObjectMapper objectMapper;
    private final InventoryService inventoryService;

    public OpsKpiProjector(
        OpsKpiSnapshotJdbcRepository opsKpiSnapshotJdbcRepository,
        ObjectMapper objectMapper,
        InventoryService inventoryService
    ) {
        this.opsKpiSnapshotJdbcRepository = opsKpiSnapshotJdbcRepository;
        this.objectMapper = objectMapper;
        this.inventoryService = inventoryService;
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
        log.warn("getInventoryTurnover stub called for tenant {} — implement COGS / average inventory turnover", tenantId);
        return 0d;
    }
}
