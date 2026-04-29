package com.smartchain.service;
import com.smartchain.audit.AuditService;
import com.smartchain.dto.CreateFxRateRequest;
import com.smartchain.entity.FxRate;
import com.smartchain.repository.FxRateRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
public class CurrencyService {
    private final FxRateRepository repository;
    private final AuditService auditService;
    public CurrencyService(FxRateRepository repository, AuditService auditService) {
        this.repository = repository; this.auditService = auditService;
    }
    @Transactional
    public UUID upsertRate(CreateFxRateRequest req) {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        FxRate rate = new FxRate();
        rate.setId(UUID.randomUUID());
        rate.setTenantId(TenantContext.tenantId());
        rate.setBaseCurrency(req.baseCurrency());
        rate.setQuoteCurrency(req.quoteCurrency());
        rate.setRate(req.rate());
        rate.setSource(req.source());
        rate.setAsOfDate(req.asOfDate());
        rate.setCreatedAt(Instant.now());
        repository.save(rate);
        auditService.logAction("FX_RATE_UPDATED", "CURRENCY", "{}", "{\"id\":\"" + rate.getId() + "\"}");
        return rate.getId();
    }
}
