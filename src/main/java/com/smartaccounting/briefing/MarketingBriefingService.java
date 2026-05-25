package com.smartaccounting.briefing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.repository.MarketingKpiSnapshotJdbcRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Service
public class MarketingBriefingService {
    private static final Logger log = LoggerFactory.getLogger(MarketingBriefingService.class);

    private final MarketingKpiSnapshotJdbcRepository marketingKpiSnapshotJdbcRepository;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public MarketingBriefingService(
        MarketingKpiSnapshotJdbcRepository marketingKpiSnapshotJdbcRepository,
        ObjectMapper objectMapper,
        JdbcTemplate jdbcTemplate
    ) {
        this.marketingKpiSnapshotJdbcRepository = marketingKpiSnapshotJdbcRepository;
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
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
        if (tenantId == null) {
            return "";
        }
        try {
            String channel = jdbcTemplate.query(
                """
                select channel from marketing_campaigns
                where tenant_id = ?
                  and started_at >= date_trunc('month', current_timestamp)
                group by channel
                order by coalesce(sum(attributed_revenue), 0) desc
                limit 1
                """,
                rs -> rs.next() ? rs.getString(1) : null,
                tenantId
            );
            return channel == null || channel.isBlank() ? "" : channel;
        } catch (Exception ex) {
            return "";
        }
    }

    public long getNewCustomers(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        try {
            Long n = jdbcTemplate.queryForObject(
                """
                select count(*)::bigint from customer_segments
                where tenant_id = ? and (created_at at time zone 'UTC')::date = current_date
                """,
                Long.class,
                tenantId
            );
            return n == null ? 0L : n;
        } catch (Exception ex) {
            return 0L;
        }
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
