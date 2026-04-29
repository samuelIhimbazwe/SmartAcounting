package com.smartchain.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.entity.ForecastJob;
import com.smartchain.forecast.ForecastService;
import com.smartchain.repository.ForecastJobRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class ForecastJobService {
    private final ForecastJobRepository repository;
    private final ForecastService forecastService;
    private final ObjectMapper objectMapper;

    public ForecastJobService(ForecastJobRepository repository,
                              ForecastService forecastService,
                              ObjectMapper objectMapper) {
        this.repository = repository;
        this.forecastService = forecastService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UUID enqueue(String metric) {
        if (TenantContext.tenantId() == null || TenantContext.userId() == null) {
            throw new IllegalStateException("Tenant/user context is required");
        }
        ForecastJob job = new ForecastJob();
        job.setId(UUID.randomUUID());
        job.setTenantId(TenantContext.tenantId());
        job.setRequestedBy(TenantContext.userId());
        job.setMetric(metric);
        job.setStatus("QUEUED");
        job.setCreatedAt(Instant.now());
        repository.save(job);
        return job.getId();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(UUID id) {
        UUID tenant = TenantContext.tenantId();
        if (tenant == null) throw new IllegalStateException("Tenant context is required");
        ForecastJob job = repository.findByIdAndTenantId(id, tenant)
            .orElseThrow(() -> new IllegalArgumentException("Forecast job not found"));
        return Map.of(
            "id", job.getId(),
            "metric", job.getMetric(),
            "status", job.getStatus(),
            "result", job.getResultJson() == null ? Map.of() : readJson(job.getResultJson()),
            "error", job.getErrorMessage() == null ? "" : job.getErrorMessage(),
            "createdAt", String.valueOf(job.getCreatedAt()),
            "startedAt", String.valueOf(job.getStartedAt()),
            "completedAt", String.valueOf(job.getCompletedAt())
        );
    }

    @Scheduled(fixedDelayString = "${smartchain.forecast.job-delay-ms:2000}")
    @Transactional
    public void processQueued() {
        for (ForecastJob job : repository.findTop25ByStatusOrderByCreatedAtAsc("QUEUED")) {
            job.setStatus("RUNNING");
            job.setStartedAt(Instant.now());
            repository.save(job);
            try {
                TenantContext.set(job.getTenantId(), job.getRequestedBy());
                Map<String, Object> result = forecastService.forecast(job.getMetric());
                job.setResultJson(objectMapper.writeValueAsString(result));
                job.setStatus("COMPLETED");
                job.setCompletedAt(Instant.now());
            } catch (Exception ex) {
                job.setStatus("FAILED");
                job.setErrorMessage(ex.getMessage());
                job.setCompletedAt(Instant.now());
            } finally {
                TenantContext.clear();
            }
            repository.save(job);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readJson(String json) {
        try {
            return objectMapper.readValue(json.getBytes(java.nio.charset.StandardCharsets.UTF_8), Map.class);
        } catch (Exception ex) {
            return Map.of("raw", json);
        }
    }
}
