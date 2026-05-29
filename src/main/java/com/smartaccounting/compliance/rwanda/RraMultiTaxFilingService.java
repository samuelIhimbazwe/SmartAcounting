package com.smartaccounting.compliance.rwanda;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.compliance.VatFilingCalendarService;
import com.smartaccounting.entity.Invoice;
import com.smartaccounting.entity.RraRwandaSettings;
import com.smartaccounting.entity.RraTaxFiling;
import com.smartaccounting.entity.SupplierBill;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.repository.RraRwandaSettingsRepository;
import com.smartaccounting.repository.RraTaxFilingRepository;
import com.smartaccounting.repository.SupplierBillRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * VAT automation from posted AR/AP documents plus scaffolding for PAYE, withholding, and CIT filings
 * inside the monthly close rhythm (due dates configurable; VAT default follows RRA monthly cadence).
 */
@Service
public class RraMultiTaxFilingService {

    public static final String VAT = "VAT";
    public static final String PAYE = "PAYE";
    public static final String WHT = "WHT";
    public static final String CIT = "CIT";

    private static final ZoneId KIGALI = ZoneId.of("Africa/Kigali");

    private final InvoiceRepository invoiceRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final RraRwandaSettingsRepository settingsRepository;
    private final RraTaxFilingRepository filingRepository;
    private final RraHttpGateway httpGateway;
    private final RwandaComplianceProperties properties;
    private final ObjectMapper objectMapper;
    private final RwandaTaxCalendarService taxCalendarService;
    private final VatFilingCalendarService vatFilingCalendarService;

    public RraMultiTaxFilingService(InvoiceRepository invoiceRepository,
                                    SupplierBillRepository supplierBillRepository,
                                    RraRwandaSettingsRepository settingsRepository,
                                    RraTaxFilingRepository filingRepository,
                                    RraHttpGateway httpGateway,
                                    RwandaComplianceProperties properties,
                                    ObjectMapper objectMapper,
                                    RwandaTaxCalendarService taxCalendarService,
                                    VatFilingCalendarService vatFilingCalendarService) {
        this.invoiceRepository = invoiceRepository;
        this.supplierBillRepository = supplierBillRepository;
        this.settingsRepository = settingsRepository;
        this.filingRepository = filingRepository;
        this.httpGateway = httpGateway;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.taxCalendarService = taxCalendarService;
        this.vatFilingCalendarService = vatFilingCalendarService;
    }

    @Transactional
    public List<RraTaxFiling> refreshDrafts(String period) throws Exception {
        UUID tenant = requireTenant();
        YearMonth ym = YearMonth.parse(period);
        Instant from = ym.atDay(1).atStartOfDay(KIGALI).toInstant();
        Instant to = ym.atEndOfMonth().atTime(23, 59, 59).atZone(KIGALI).toInstant();

        RraRwandaSettings settings = settingsRepository.findById(tenant).orElse(null);
        boolean inclusive = settings != null && settings.isAmountsTaxInclusive();

        BigDecimal outputVat = BigDecimal.ZERO;
        BigDecimal salesNet = BigDecimal.ZERO;
        for (Invoice inv : invoiceRepository.findByTenantIdAndDeletedAtIsNullAndCreatedAtBetween(tenant, from, to)) {
            Map<String, BigDecimal> split = RwandaVatMath.splitLineAmount(inv.getAmount(), inclusive, properties.getVatRatePercent());
            outputVat = outputVat.add(split.get("vat"));
            salesNet = salesNet.add(split.get("net"));
        }

        BigDecimal inputVat = BigDecimal.ZERO;
        BigDecimal purchasesNet = BigDecimal.ZERO;
        for (SupplierBill bill : supplierBillRepository.findByTenantIdAndDeletedAtIsNullAndCreatedAtBetween(tenant, from, to)) {
            Map<String, BigDecimal> split = RwandaVatMath.splitLineAmount(bill.getAmount(), inclusive, properties.getVatRatePercent());
            inputVat = inputVat.add(split.get("vat"));
            purchasesNet = purchasesNet.add(split.get("net"));
        }

        BigDecimal netPayable = outputVat.subtract(inputVat);

        Map<String, Object> vatDraft = new LinkedHashMap<>();
        vatDraft.put("period", period);
        vatDraft.put("schema", "smartaccounting.rra.vat-return.v1");
        vatDraft.put("outputVat", outputVat);
        vatDraft.put("inputVatCredit", inputVat);
        vatDraft.put("netVatPayable", netPayable);
        vatDraft.put("taxableSalesNet", salesNet);
        vatDraft.put("taxablePurchasesNet", purchasesNet);
        vatDraft.put("amountsInterpretedAsTaxInclusive", inclusive);
        vatDraft.put("vatRatePercent", properties.getVatRatePercent());

        LocalDate due = dueDateForMonth(ym);

        upsertFiling(tenant, VAT, period, due, objectMapper.writeValueAsString(vatDraft), "DRAFT");
        upsertPlaceholder(tenant, PAYE, period, due, "Monthly PAYE — attach payroll register / RSSB exports when payroll module is integrated.");
        upsertPlaceholder(tenant, WHT, period, due, "Withholding tax positions — tie out from supplier/subcontractor registers.");
        upsertPlaceholder(tenant, CIT, period, due, "Corporate income tax — quarterly/annual obligations managed per RRA calendar; accrual review in close.");
        taxCalendarService.initializeFilingCalendar(tenant.toString(), ym);

        return filingRepository.findByTenantIdAndPeriodOrderByFilingTypeAsc(tenant, period);
    }

    private LocalDate dueDateForMonth(YearMonth ym) {
        YearMonth next = ym.plusMonths(1);
        int dom = Math.min(properties.getVatReturnDueDayOfNextMonth(), next.lengthOfMonth());
        return LocalDate.of(next.getYear(), next.getMonth(), dom);
    }

    private void upsertFiling(UUID tenant, String type, String period, LocalDate due, String draftJson, String status) {
        RraTaxFiling f = filingRepository.findByTenantIdAndFilingTypeAndPeriod(tenant, type, period).orElseGet(() -> {
            RraTaxFiling n = new RraTaxFiling();
            n.setId(UUID.randomUUID());
            n.setTenantId(tenant);
            n.setFilingType(type);
            n.setPeriod(period);
            n.setCreatedAt(Instant.now());
            return n;
        });
        f.setDraftPayload(draftJson);
        f.setDueDate(due);
        f.setStatus(status);
        f.setUpdatedAt(Instant.now());
        filingRepository.save(f);
    }

    private void upsertPlaceholder(UUID tenant, String type, String period, LocalDate due, String note) throws Exception {
        Map<String, Object> map = Map.of(
            "period", period,
            "note", note,
            "schema", "smartaccounting.rra.placeholder.v1"
        );
        upsertFiling(tenant, type, period, due, objectMapper.writeValueAsString(map), "DRAFT");
    }

    @Transactional
    public RraTaxFiling submitVatReturn(String period) throws Exception {
        UUID tenant = requireTenant();
        RraTaxFiling filing = filingRepository.findByTenantIdAndFilingTypeAndPeriod(tenant, VAT, period)
            .orElseThrow(() -> new IllegalArgumentException("VAT filing draft not found; call refresh first"));
        if (!"DRAFT".equals(filing.getStatus()) && !"READY".equals(filing.getStatus())) {
            throw new IllegalStateException("VAT filing not in submittable state: " + filing.getStatus());
        }
        String body = filing.getDraftPayload() != null ? filing.getDraftPayload() : "{}";
        Map<String, Object> resp = httpGateway.postJson(properties, properties.getVatReturnSubmitPath(), body);
        filing.setSubmittedPayload(objectMapper.writeValueAsString(resp));
        filing.setUpdatedAt(Instant.now());
        filing.setSubmittedAt(Instant.now());

        boolean stub = Boolean.TRUE.equals(resp.get("stub"));
        boolean ok = !Boolean.FALSE.equals(resp.get("ok")) && resp.get("error") == null;
        if (stub || ok || resp.containsKey("reference")) {
            filing.setStatus("SUBMITTED");
            Object ref = resp.get("reference");
            if (ref != null) {
                filing.setRraAckReference(String.valueOf(ref));
            }
        } else {
            filing.setStatus("FAILED");
            filing.setLastError(String.valueOf(resp.get("error")));
        }
        filingRepository.save(filing);
        if ("SUBMITTED".equals(filing.getStatus())) {
            vatFilingCalendarService.markSubmitted(tenant, period, filing.getRraAckReference());
        }
        return filing;
    }

    @Transactional(readOnly = true)
    public List<RraTaxFiling> list(String period) {
        requireTenant();
        return filingRepository.findByTenantIdAndPeriodOrderByFilingTypeAsc(TenantContext.tenantId(), period);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
