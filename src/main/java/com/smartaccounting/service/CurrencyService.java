package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.CreateFxRateRequest;
import com.smartaccounting.entity.FxRate;
import com.smartaccounting.repository.FxRateRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class CurrencyService {
    private final FxRateRepository repository;
    private final AuditService auditService;

    public CurrencyService(FxRateRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    /**
     * Converts {@code amount} expressed in {@code fromCurrency} into {@code toCurrency}
     * using the latest tenant FX row for the pair (direct or inverse).
     * Convention: stored {@link FxRate#getRate()} is quote-per-base (multiply an amount in base by the rate to obtain quote).
     */
    @Transactional(readOnly = true)
    public BigDecimal convertAmount(BigDecimal amount, String fromCurrency, String toCurrency) {
        if (amount == null) {
            throw new IllegalArgumentException("amount is required");
        }
        String from = fromCurrency != null ? fromCurrency.trim().toUpperCase(Locale.ROOT) : "";
        String to = toCurrency != null ? toCurrency.trim().toUpperCase(Locale.ROOT) : "";
        if (from.isEmpty() || to.isEmpty()) {
            throw new IllegalArgumentException("fromCurrency and toCurrency are required");
        }
        if (from.equals(to)) {
            return amount;
        }
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        UUID tenant = TenantContext.tenantId();

        Optional<FxRate> direct = repository.findFirstByTenantIdAndBaseCurrencyAndQuoteCurrencyOrderByAsOfDateDescCreatedAtDesc(
            tenant, from, to);
        if (direct.isPresent()) {
            return amount.multiply(direct.get().getRate()).setScale(8, RoundingMode.HALF_UP);
        }
        Optional<FxRate> inverse = repository.findFirstByTenantIdAndBaseCurrencyAndQuoteCurrencyOrderByAsOfDateDescCreatedAtDesc(
            tenant, to, from);
        if (inverse.isPresent()) {
            BigDecimal r = inverse.get().getRate();
            if (r.compareTo(BigDecimal.ZERO) == 0) {
                throw new IllegalArgumentException("Invalid FX rate (zero) for " + to + "/" + from);
            }
            return amount.divide(r, 8, RoundingMode.HALF_UP);
        }
        throw new IllegalArgumentException(
            "No FX rate for " + from + "/" + to + ". Post a rate via POST /api/v1/currency/rates (quote-per-base).");
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
