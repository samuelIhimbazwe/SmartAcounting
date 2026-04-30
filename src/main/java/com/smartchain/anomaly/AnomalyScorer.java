package com.smartchain.anomaly;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.entity.AnomalyCase;
import com.smartchain.events.DomainEventPublisher;
import com.smartchain.repository.AnomalyCaseRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AnomalyScorer {
    private final JdbcTemplate jdbcTemplate;
    private final AnomalyCaseRepository anomalyCaseRepository;
    private final DomainEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public AnomalyScorer(JdbcTemplate jdbcTemplate,
                         AnomalyCaseRepository anomalyCaseRepository,
                         DomainEventPublisher eventPublisher,
                         ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.anomalyCaseRepository = anomalyCaseRepository;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${smartchain.anomaly.scan-delay-ms:300000}")
    @Transactional
    public void score() {
        List<Map<String, Object>> tenants = jdbcTemplate.queryForList("select distinct tenant_id from event_log");
        for (Map<String, Object> row : tenants) {
            UUID tenant = UUID.fromString(String.valueOf(row.get("tenant_id")));
            BigDecimal current = jdbcTemplate.queryForObject(
                "select coalesce(sum(amount),0) from journal_entries where tenant_id = ? and entry_date = current_date",
                BigDecimal.class, tenant);
            BigDecimal avg = jdbcTemplate.queryForObject(
                "select coalesce(avg(amount),0) from journal_entries where tenant_id = ? and entry_date >= current_date - interval '90 day'",
                BigDecimal.class, tenant);
            if (avg == null) avg = BigDecimal.ZERO;
            BigDecimal z = avg.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO :
                current.subtract(avg).divide(avg.abs().max(BigDecimal.ONE), 4, java.math.RoundingMode.HALF_UP);
            if (z.abs().doubleValue() > 2.5) {
                createCase(tenant, "cfo", current, avg, z);
            }
        }
    }

    private void createCase(UUID tenant, String role, BigDecimal current, BigDecimal expected, BigDecimal z) {
        AnomalyCase c = new AnomalyCase();
        c.setId(UUID.randomUUID());
        c.setTenantId(tenant);
        c.setAffectedRole(role);
        c.setSeverity(z.abs().doubleValue() > 4.5 ? "CRITICAL" : z.abs().doubleValue() > 3.5 ? "HIGH" : "MEDIUM");
        c.setTitle("Anomalous journal movement");
        c.setDetails("Journal movement deviates from rolling baseline.");
        c.setKpiName("journal_volume_daily");
        c.setCurrentValue(current);
        c.setExpectedRange(expected + " +/- 10%");
        c.setZScore(z);
        try {
            c.setContributorsJson(objectMapper.writeValueAsString(List.of(
                Map.of("source", "journal_entries", "hint", "top daily postings"),
                Map.of("source", "payments", "hint", "payment spikes")
            )));
        } catch (Exception ignored) {
            c.setContributorsJson("[]");
        }
        c.setStatus("OPEN");
        c.setCreatedAt(Instant.now());
        anomalyCaseRepository.save(c);
        if ("HIGH".equals(c.getSeverity()) || "CRITICAL".equals(c.getSeverity())) {
            eventPublisher.publish("domain.alerts", "ANOMALY_ALERT", Map.of(
                "tenantId", tenant.toString(),
                "role", role,
                "anomalyId", c.getId().toString(),
                "severity", c.getSeverity(),
                "title", c.getTitle()
            ));
        }
    }
}
