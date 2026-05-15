package com.smartaccounting.briefing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.entity.CeoKpiSnapshot;
import com.smartaccounting.repository.CeoKpiSnapshotRepository;
import com.smartaccounting.repository.CfoKpiSnapshotJdbcRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Component
public class CfoKpiProjector {
    private static final Logger log = LoggerFactory.getLogger(CfoKpiProjector.class);

    private final CfoKpiSnapshotJdbcRepository cfoKpiSnapshotJdbcRepository;
    private final CeoKpiSnapshotRepository ceoKpiSnapshotRepository;
    private final ObjectMapper objectMapper;

    public CfoKpiProjector(CfoKpiSnapshotJdbcRepository cfoKpiSnapshotJdbcRepository,
                         CeoKpiSnapshotRepository ceoKpiSnapshotRepository,
                         ObjectMapper objectMapper) {
        this.cfoKpiSnapshotJdbcRepository = cfoKpiSnapshotJdbcRepository;
        this.ceoKpiSnapshotRepository = ceoKpiSnapshotRepository;
        this.objectMapper = objectMapper;
    }

    public double getCashPosition(UUID tenantId) {
        return readDouble(tenantId, "ledgerAmount");
    }

    /**
     * Best-effort runway in calendar days from CEO KPI snapshot (weeks × 7), else DSO-based proxy, else 0.
     */
    public long getCashRunwayDays(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        try {
            Optional<CeoKpiSnapshot> snap = ceoKpiSnapshotRepository.findByTenantIdAndSnapshotDate(tenantId, LocalDate.now());
            if (snap.isPresent()) {
                JsonNode n = objectMapper.readTree(snap.get().getPayload());
                int weeks = n.path("cashRunwayWeeks").asInt(0);
                if (weeks > 0) {
                    return (long) weeks * 7L;
                }
            }
        } catch (Exception ex) {
            log.debug("getCashRunwayDays CEO snapshot parse failed for {}: {}", tenantId, ex.getMessage());
        }
        double dso = getDso(tenantId);
        return dso > 0 ? Math.round(dso * 2) : 0L;
    }

    /**
     * Positive ratio when gross margin % dropped vs last available CEO snapshot (up to ~31d lookback).
     */
    public double getMarginDropVsLastMonth(UUID tenantId) {
        if (tenantId == null) {
            return 0d;
        }
        try {
            double cur = readCeoMarginPct(tenantId, LocalDate.now());
            double prev = 0d;
            for (int d = 1; d <= 40; d++) {
                prev = readCeoMarginPct(tenantId, LocalDate.now().minusDays(d));
                if (prev > 0) {
                    break;
                }
            }
            if (prev <= 0 || cur <= 0) {
                return 0d;
            }
            return Math.max(0d, (prev - cur) / prev);
        } catch (Exception ex) {
            return 0d;
        }
    }

    private double readCeoMarginPct(UUID tenantId, LocalDate date) {
        try {
            Optional<CeoKpiSnapshot> snap = ceoKpiSnapshotRepository.findByTenantIdAndSnapshotDate(tenantId, date);
            if (snap.isEmpty()) {
                return 0d;
            }
            JsonNode n = objectMapper.readTree(snap.get().getPayload());
            return n.path("grossMarginPct").asDouble(0);
        } catch (Exception ex) {
            return 0d;
        }
    }

    public double getDso(UUID tenantId) {
        return readDouble(tenantId, "dsoDays");
    }

    public double getDpo(UUID tenantId) {
        log.warn("getDpo stub called for tenant {} — implement DPO from supplier aging / AP snapshots", tenantId);
        return 0d;
    }

    private double readDouble(UUID tenantId, String field) {
        if (tenantId == null) {
            return 0d;
        }
        try {
            Optional<String> payload = cfoKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (payload.isEmpty()) {
                return 0d;
            }
            JsonNode n = objectMapper.readTree(payload.get());
            return n.path(field).asDouble(0);
        } catch (Exception ex) {
            return 0d;
        }
    }
}
