package com.smartaccounting.compliance.rwanda;

import com.smartaccounting.entity.RraTaxFiling;
import com.smartaccounting.repository.RraTaxFilingRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

/**
 * Tax filing calendar entries for Rwanda compliance (including EBM reconciliation).
 */
@Service
public class RwandaTaxCalendarService {
    public static final String EBM_RECONCILIATION = "EBM_RECONCILIATION";

    private final RraTaxFilingRepository filingRepository;
    private final RwandaComplianceProperties properties;

    public RwandaTaxCalendarService(RraTaxFilingRepository filingRepository,
                                    RwandaComplianceProperties properties) {
        this.filingRepository = filingRepository;
        this.properties = properties;
    }

    @Transactional
    public void initializeFilingCalendar(String tenantId, YearMonth period) {
        UUID tid = UUID.fromString(tenantId);
        YearMonth next = period.plusMonths(1);
        int dom = Math.min(properties.getVatReturnDueDayOfNextMonth(), next.lengthOfMonth());
        LocalDate due = LocalDate.of(next.getYear(), next.getMonth(), dom);
        upsert(tid, EBM_RECONCILIATION, period.toString(), due);
    }

    private void upsert(UUID tenantId, String filingType, String period, LocalDate due) {
        RraTaxFiling f = filingRepository.findByTenantIdAndFilingTypeAndPeriod(tenantId, filingType, period)
            .orElseGet(() -> {
                RraTaxFiling n = new RraTaxFiling();
                n.setId(UUID.randomUUID());
                n.setTenantId(tenantId);
                n.setFilingType(filingType);
                n.setPeriod(period);
                n.setCreatedAt(Instant.now());
                return n;
            });
        f.setDueDate(due);
        f.setStatus("PENDING");
        f.setDraftPayload("{\"note\":\"EBM data submitted in real-time per transaction; monthly reconciliation due with VAT return\"}");
        f.setUpdatedAt(Instant.now());
        filingRepository.save(f);
    }

    @Transactional
    public void initializeFilingCalendarForCurrentTenant(YearMonth period) {
        if (TenantContext.tenantId() == null) {
            return;
        }
        initializeFilingCalendar(TenantContext.tenantId().toString(), period);
    }
}
