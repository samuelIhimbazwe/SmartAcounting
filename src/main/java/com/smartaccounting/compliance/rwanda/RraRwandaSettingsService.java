package com.smartaccounting.compliance.rwanda;

import com.smartaccounting.dto.UpdateRraRwandaSettingsRequest;
import com.smartaccounting.entity.RraRwandaSettings;
import com.smartaccounting.repository.RraRwandaSettingsRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class RraRwandaSettingsService {
    private final RraRwandaSettingsRepository repository;
    private final RwandaComplianceProperties properties;

    public RraRwandaSettingsService(RraRwandaSettingsRepository repository,
                                    RwandaComplianceProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public Optional<RraRwandaSettings> current() {
        requireTenant();
        return repository.findById(TenantContext.tenantId());
    }

    @Transactional
    public RraRwandaSettings upsert(UpdateRraRwandaSettingsRequest req) {
        requireTenant();
        UUID tid = TenantContext.tenantId();
        Instant now = Instant.now();
        RraRwandaSettings s = repository.findById(tid).orElseGet(() -> {
            RraRwandaSettings n = new RraRwandaSettings();
            n.setTenantId(tid);
            n.setCreatedAt(now);
            n.setEisIntegrationEnabled(true);
            n.setAmountsTaxInclusive(false);
            n.setVatRegistered(false);
            n.setTurnoverExceedsVatThreshold(false);
            return n;
        });
        if (req.tin() != null) s.setTin(req.tin());
        if (req.companyTradeName() != null) s.setCompanyTradeName(req.companyTradeName());
        if (req.vatRegistered() != null) s.setVatRegistered(req.vatRegistered());
        if (req.turnoverExceedsVatThreshold() != null) s.setTurnoverExceedsVatThreshold(req.turnoverExceedsVatThreshold());
        if (req.amountsTaxInclusive() != null) s.setAmountsTaxInclusive(req.amountsTaxInclusive());
        if (req.eisIntegrationEnabled() != null) s.setEisIntegrationEnabled(req.eisIntegrationEnabled());
        if (req.notes() != null) s.setNotes(req.notes());
        s.setUpdatedAt(now);
        repository.save(s);
        return s;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> complianceHints() {
        return Map.of(
            "vatRatePercent", properties.getVatRatePercent(),
            "vatMandatoryRegistrationTurnoverRwf", properties.getVatMandatoryRegistrationTurnoverRwf(),
            "vatReturnDueDayOfNextMonth", properties.getVatReturnDueDayOfNextMonth(),
            "eisIntegrationToggle", properties.isEnabled(),
            "notes",
            "Create tax profiles via POST /api/v1/tax/profiles with country RW and tax VAT when ready. "
                + "VAT registration when turnover exceeds threshold is enforced administratively; "
                + "monthly VAT returns are commonly due by the 15th of the following month. "
                + "Configure smartaccounting.rra.rwanda.* and obtain certified EIS endpoints from RRA."
        );
    }

    private void requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
    }
}
