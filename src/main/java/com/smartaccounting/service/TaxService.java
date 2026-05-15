package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.CreateTaxProfileRequest;
import com.smartaccounting.dto.TaxCalculationRequest;
import com.smartaccounting.entity.TaxProfile;
import com.smartaccounting.repository.TaxProfileRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class TaxService {
    private final TaxProfileRepository repository;
    private final AuditService auditService;

    public TaxService(TaxProfileRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @Transactional
    public UUID createProfile(CreateTaxProfileRequest req) {
        requireTenant();
        TaxProfile p = new TaxProfile();
        p.setId(UUID.randomUUID());
        p.setTenantId(TenantContext.tenantId());
        p.setCountryCode(req.countryCode().toUpperCase());
        p.setTaxCode(req.taxCode().toUpperCase());
        p.setRate(req.rate());
        p.setActive(true);
        p.setCreatedAt(Instant.now());
        repository.save(p);
        auditService.logAction("TAX_PROFILE_CREATED", "TAX_PROFILE", "{}", "{\"id\":\"" + p.getId() + "\"}");
        return p.getId();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> calculate(TaxCalculationRequest req) {
        TaxProfile p = repository.findFirstByCountryCodeAndTaxCodeAndActiveTrue(
            req.countryCode().toUpperCase(), req.taxCode().toUpperCase()
        ).orElseThrow(() -> new IllegalArgumentException("Tax profile not found"));
        BigDecimal tax = req.amount().multiply(p.getRate()).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return Map.of(
            "countryCode", p.getCountryCode(),
            "taxCode", p.getTaxCode(),
            "rate", p.getRate(),
            "amount", req.amount(),
            "taxAmount", tax,
            "totalAmount", req.amount().add(tax)
        );
    }

    private void requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
    }
}
