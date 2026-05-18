package com.smartaccounting.config;

import com.smartaccounting.entity.EbmConfig;
import com.smartaccounting.repository.EbmConfigRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Component("ebm")
public class EbmHealthIndicator implements HealthIndicator {

    private final EbmConfigRepository configRepository;
    private final RestClient restClient = RestClient.create();

    public EbmHealthIndicator(EbmConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    @Override
    public Health health() {
        if (TenantContext.tenantId() == null) {
            return Health.unknown().withDetail("reason", "no tenant context").build();
        }
        Optional<EbmConfig> config = configRepository.findByTenantId(TenantContext.tenantId());
        if (config.isEmpty() || !config.get().isActive()) {
            return Health.up().withDetail("configured", false).build();
        }
        String base = config.get().getEbmApiUrl();
        if (base == null || base.isBlank()) {
            return Health.down().withDetail("reason", "missing endpoint").build();
        }
        try {
            restClient.get().uri(base + "/health").retrieve().toBodilessEntity();
            return Health.up().withDetail("endpoint", base).build();
        } catch (Exception ex) {
            return Health.down(ex).withDetail("endpoint", base).build();
        }
    }
}
