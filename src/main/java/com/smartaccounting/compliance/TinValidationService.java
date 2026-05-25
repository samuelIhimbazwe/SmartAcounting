package com.smartaccounting.compliance;

import com.smartaccounting.compliance.rwanda.RraHttpGateway;
import com.smartaccounting.compliance.rwanda.RwandaComplianceProperties;
import com.smartaccounting.dto.TinValidationResponse;
import com.smartaccounting.entity.EbmConfig;
import com.smartaccounting.entity.FinanceCustomer;
import com.smartaccounting.entity.RraRwandaSettings;
import com.smartaccounting.repository.EbmConfigRepository;
import com.smartaccounting.repository.FinanceCustomerRepository;
import com.smartaccounting.repository.RraRwandaSettingsRepository;
import com.smartaccounting.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class TinValidationService {
    private static final Logger log = LoggerFactory.getLogger(TinValidationService.class);
    private static final Pattern RWA_TIN = Pattern.compile("^\\d{9}$");

    private final FinanceCustomerRepository customerRepository;
    private final EbmConfigRepository ebmConfigRepository;
    private final RraRwandaSettingsRepository rwandaSettingsRepository;
    private final RraHttpGateway rraHttpGateway;
    private final RwandaComplianceProperties rwandaProperties;

    public TinValidationService(
        FinanceCustomerRepository customerRepository,
        EbmConfigRepository ebmConfigRepository,
        RraRwandaSettingsRepository rwandaSettingsRepository,
        RraHttpGateway rraHttpGateway,
        RwandaComplianceProperties rwandaProperties
    ) {
        this.customerRepository = customerRepository;
        this.ebmConfigRepository = ebmConfigRepository;
        this.rwandaSettingsRepository = rwandaSettingsRepository;
        this.rraHttpGateway = rraHttpGateway;
        this.rwandaProperties = rwandaProperties;
    }

    public TinValidationResponse validate(String rawTin) {
        String tin = rawTin == null ? "" : rawTin.trim();
        if (tin.isEmpty()) {
            return TinValidationResponse.permissiveOk();
        }
        if (!RWA_TIN.matcher(tin).matches()) {
            return TinValidationResponse.fail("Invalid TIN format");
        }

        UUID tenantId = TenantContext.tenantId();

        Optional<FinanceCustomer> customer = customerRepository
            .findFirstByTenantIdAndTinNumberAndDeletedAtIsNull(tenantId, tin);
        if (customer.isPresent()) {
            return TinValidationResponse.ok(customer.get().getCustomerName());
        }

        Optional<String> tenantName = resolveTenantRegisteredName(tenantId, tin);
        if (tenantName.isPresent()) {
            return TinValidationResponse.ok(tenantName.get());
        }

        if (!rraIntegrationLive()) {
            log.warn(
                "RRA TIN validate skipped (integration not live) for tin={} tenant={} — returning valid=true",
                tin,
                tenantId
            );
            return TinValidationResponse.permissiveOk();
        }

        return mapRraResponse(tin, rraHttpGateway.validateTin(rwandaProperties, tin));
    }

    private Optional<String> resolveTenantRegisteredName(UUID tenantId, String tin) {
        Optional<EbmConfig> ebm = ebmConfigRepository.findByTenantId(tenantId);
        if (ebm.isPresent() && tin.equals(ebm.get().getEbmTin())) {
            return Optional.ofNullable(ebm.get().getEbmDeviceSerial())
                .filter(s -> !s.isBlank())
                .or(() -> Optional.of("EBM registered taxpayer"));
        }
        Optional<RraRwandaSettings> settings = rwandaSettingsRepository.findById(tenantId);
        if (settings.isPresent() && tin.equals(settings.get().getTin())) {
            String trade = settings.get().getCompanyTradeName();
            return Optional.of(trade != null && !trade.isBlank() ? trade : "Registered taxpayer");
        }
        return Optional.empty();
    }

    boolean rraIntegrationLive() {
        if (!rwandaProperties.isEnabled()) {
            return false;
        }
        String envName = rwandaProperties.getApiTokenEnvironmentVariable();
        if (envName == null || envName.isBlank()) {
            return false;
        }
        String token = System.getenv(envName);
        return token != null && !token.isBlank();
    }

    private TinValidationResponse mapRraResponse(String tin, Map<String, Object> raw) {
        if (raw == null || raw.isEmpty()) {
            log.warn("RRA TIN validate empty response for tin={} — returning valid=true", tin);
            return TinValidationResponse.permissiveOk();
        }
        if (Boolean.TRUE.equals(raw.get("stub"))) {
            log.warn(
                "RRA TIN validate stub for tin={}: {} — returning valid=true",
                tin,
                raw.get("message")
            );
            return TinValidationResponse.permissiveOk();
        }
        if (Boolean.FALSE.equals(raw.get("ok"))) {
            Object err = raw.get("error");
            String message = err != null ? err.toString() : "TIN not found at RRA";
            return TinValidationResponse.fail(message);
        }

        Boolean valid = asBoolean(raw.get("valid"));
        if (valid == null) {
            valid = asBoolean(raw.get("registered"));
        }
        if (valid == null) {
            log.warn("RRA TIN validate ambiguous response for tin={} — returning valid=true", tin);
            return TinValidationResponse.permissiveOk();
        }
        if (!valid) {
            Object err = raw.get("error");
            String message = err != null ? err.toString() : "TIN is not registered with RRA";
            return TinValidationResponse.fail(message);
        }
        Object name = raw.get("name");
        return TinValidationResponse.ok(name != null ? name.toString() : null);
    }

    private static Boolean asBoolean(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof String s) {
            if ("true".equalsIgnoreCase(s)) {
                return true;
            }
            if ("false".equalsIgnoreCase(s)) {
                return false;
            }
        }
        return null;
    }
}
