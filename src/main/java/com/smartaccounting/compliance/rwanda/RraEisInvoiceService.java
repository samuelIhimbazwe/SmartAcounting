package com.smartaccounting.compliance.rwanda;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.entity.Invoice;
import com.smartaccounting.entity.RraEisSubmission;
import com.smartaccounting.entity.RraRwandaSettings;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.repository.RraEisSubmissionRepository;
import com.smartaccounting.repository.RraRwandaSettingsRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Builds a versioned JSON payload for electronic invoicing and pushes it through {@link RraHttpGateway}.
 * Align field names with your certified EIS schema before production use.
 */
@Service
public class RraEisInvoiceService {
    public static final String SCHEMA = "smartaccounting.rra.eis.invoice.v1";

    private final InvoiceRepository invoiceRepository;
    private final RraRwandaSettingsRepository settingsRepository;
    private final RraEisSubmissionRepository submissionRepository;
    private final RraHttpGateway httpGateway;
    private final RwandaComplianceProperties properties;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    public RraEisInvoiceService(InvoiceRepository invoiceRepository,
                                RraRwandaSettingsRepository settingsRepository,
                                RraEisSubmissionRepository submissionRepository,
                                RraHttpGateway httpGateway,
                                RwandaComplianceProperties properties,
                                ObjectMapper objectMapper,
                                AuditService auditService) {
        this.invoiceRepository = invoiceRepository;
        this.settingsRepository = settingsRepository;
        this.submissionRepository = submissionRepository;
        this.httpGateway = httpGateway;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    @Transactional
    public RraEisSubmission submit(UUID invoiceId) throws Exception {
        UUID tenantId = requireTenant();
        Invoice invoice = invoiceRepository.findByIdAndDeletedAtIsNull(invoiceId)
            .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        if (!tenantId.equals(invoice.getTenantId())) {
            throw new IllegalArgumentException("Invoice not found");
        }
        RraRwandaSettings settings = settingsRepository.findById(tenantId)
            .orElseThrow(() -> new IllegalStateException("Configure Rwanda RRA settings before EIS submission"));
        if (!settings.isEisIntegrationEnabled()) {
            throw new IllegalStateException("EIS integration disabled for tenant");
        }
        if (settings.getTin() == null || settings.getTin().isBlank()) {
            throw new IllegalStateException("TIN is required on Rwanda settings for EIS submission");
        }

        Map<String, BigDecimal> split = RwandaVatMath.splitLineAmount(
            invoice.getAmount(),
            settings.isAmountsTaxInclusive(),
            properties.getVatRatePercent()
        );

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("schema", SCHEMA);
        payload.put("tin", settings.getTin());
        payload.put("tradeName", settings.getCompanyTradeName());
        payload.put("invoiceId", invoice.getId().toString());
        payload.put("customerName", invoice.getCustomerName());
        payload.put("currency", invoice.getCurrencyCode());
        payload.put("issueInstant", invoice.getCreatedAt() != null ? invoice.getCreatedAt().toString() : Instant.now().toString());
        payload.put("taxableNet", split.get("net"));
        payload.put("vatAmount", split.get("vat"));
        payload.put("grossAmount", split.get("gross"));
        payload.put("vatRatePercent", properties.getVatRatePercent());

        String json = objectMapper.writeValueAsString(payload);

        RraEisSubmission row = new RraEisSubmission();
        row.setId(UUID.randomUUID());
        row.setTenantId(tenantId);
        row.setInvoiceId(invoiceId);
        row.setStatus("PENDING");
        row.setRequestPayload(json);
        row.setCreatedAt(Instant.now());
        submissionRepository.save(row);

        Map<String, Object> resp = httpGateway.postJson(properties, properties.getEisSubmitPath(), json);
        row.setResponsePayload(objectMapper.writeValueAsString(resp));
        row.setCompletedAt(Instant.now());

        boolean stubOk = Boolean.TRUE.equals(resp.get("stub"));
        boolean explicitFail = Boolean.FALSE.equals(resp.get("ok"));
        boolean success = stubOk || (!explicitFail && resp.get("error") == null);

        if (resp.get("httpStatus") instanceof Integer i) {
            row.setHttpStatus(i);
        }

        if (success) {
            row.setStatus("SUCCEEDED");
            Object ref = resp.get("reference");
            if (ref != null) {
                row.setRraReference(String.valueOf(ref));
            }
            auditService.logAction("RRA_EIS_SUBMITTED", "INVOICE", "{}", "{\"invoiceId\":\"" + invoiceId + "\"}");
        } else {
            row.setStatus("FAILED");
            row.setErrorMessage(String.valueOf(resp.getOrDefault("error", resp)));
        }
        submissionRepository.save(row);
        return row;
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
