package com.smartaccounting.service;

import com.smartaccounting.entity.Accrual;
import com.smartaccounting.repository.AccrualRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AccrualService {
    private final AccrualRepository accrualRepository;

    public AccrualService(AccrualRepository accrualRepository) {
        this.accrualRepository = accrualRepository;
    }

    public Accrual create(Accrual accrual) {
        UUID tenantId = requireTenant();
        accrual.setId(UUID.randomUUID());
        accrual.setTenantId(tenantId);
        if (accrual.getStatus() == null) {
            accrual.setStatus("ACTIVE");
        }
        if (accrual.getCurrencyCode() == null) {
            accrual.setCurrencyCode("RWF");
        }
        if (accrual.getAutoReverse() == null) {
            accrual.setAutoReverse(Boolean.TRUE);
        }
        if (accrual.getMonthsTotal() != null && accrual.getMonthsTotal() > 0 && accrual.getAmount() != null) {
            accrual.setMonthlyAmount(accrual.getAmount()
                .divide(BigDecimal.valueOf(accrual.getMonthsTotal()), 4, RoundingMode.HALF_UP));
        } else if (accrual.getStartDate() != null && accrual.getEndDate() != null && accrual.getAmount() != null) {
            long months = ChronoUnit.MONTHS.between(accrual.getStartDate(), accrual.getEndDate()) + 1;
            if (months > 0) {
                accrual.setMonthsTotal((int) months);
                accrual.setMonthlyAmount(accrual.getAmount()
                    .divide(BigDecimal.valueOf(months), 4, RoundingMode.HALF_UP));
            }
        }
        accrual.setCreatedAt(Instant.now());
        return accrualRepository.save(accrual);
    }

    @Transactional(readOnly = true)
    public List<Accrual> list(String status) {
        UUID tenantId = requireTenant();
        if (status != null && !status.isBlank()) {
            return accrualRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, status.toUpperCase());
        }
        return accrualRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
