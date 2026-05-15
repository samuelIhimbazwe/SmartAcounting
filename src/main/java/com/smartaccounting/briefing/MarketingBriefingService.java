package com.smartaccounting.briefing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.repository.MarketingKpiSnapshotJdbcRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Service
public class MarketingBriefingService {
    private static final Logger log = LoggerFactory.getLogger(MarketingBriefingService.class);

    private final MarketingKpiSnapshotJdbcRepository marketingKpiSnapshotJdbcRepository;
    private final ObjectMapper objectMapper;

    public MarketingBriefingService(
        MarketingKpiSnapshotJdbcRepository marketingKpiSnapshotJdbcRepository,
        ObjectMapper objectMapper
    ) {
        this.marketingKpiSnapshotJdbcRepository = marketingKpiSnapshotJdbcRepository;
        this.objectMapper = objectMapper;
    }

    public BigDecimal getSpendThisMonth(UUID tenantId) {
        return readBigDecimal(tenantId, "spendProxy");
    }

    public BigDecimal getAttributedRevenue(UUID tenantId) {
        return readBigDecimal(tenantId, "attributedRevenueProxy");
    }

    public double getRoi(UUID tenantId) {
        if (tenantId == null) {
            return 0d;
        }
        try {
            Optional<String> payload = marketingKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (payload.isEmpty()) {
                return 0d;
            }
            JsonNode n = objectMapper.readTree(payload.get());
            return n.path("blendedRoiProxy").asDouble(0);
        } catch (Exception ex) {
            return 0d;
        }
    }

    public String getTopChannel(UUID tenantId) {
        log.warn("getTopChannel stub called for tenant {} — implement channel rollup from attribution tables", tenantId);
        return "";
    }

    public long getNewCustomers(UUID tenantId) {
        log.warn("getNewCustomers stub called for tenant {} — implement campaign-sourced new customer counts", tenantId);
        return 0L;
    }

    private BigDecimal readBigDecimal(UUID tenantId, String field) {
        if (tenantId == null) {
            return BigDecimal.ZERO;
        }
        try {
            Optional<String> payload = marketingKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (payload.isEmpty()) {
                return BigDecimal.ZERO;
            }
            JsonNode n = objectMapper.readTree(payload.get());
            if (n.path(field).isMissingNode()) {
                return BigDecimal.ZERO;
            }
            return BigDecimal.valueOf(n.path(field).asDouble(0));
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }
}
