package com.smartaccounting.service;

import com.smartaccounting.compliance.EbmAuditService;
import com.smartaccounting.dto.EbmApiResponse;
import com.smartaccounting.dto.EbmComplianceReport;
import com.smartaccounting.dto.EbmConfigRequest;
import com.smartaccounting.entity.EbmConfig;
import com.smartaccounting.entity.EbmReceipt;
import com.smartaccounting.repository.EbmConfigRepository;
import com.smartaccounting.repository.EbmReceiptRepository;
import com.smartaccounting.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class EbmService {
    private static final Logger log = LoggerFactory.getLogger(EbmService.class);

    private final EbmConfigRepository ebmConfigRepository;
    private final EbmReceiptRepository ebmReceiptRepository;
    private final EbmAuditService ebmAuditService;
    private final RestClient restClient = RestClient.create();

    public EbmService(EbmConfigRepository ebmConfigRepository,
                      EbmReceiptRepository ebmReceiptRepository,
                      EbmAuditService ebmAuditService) {
        this.ebmConfigRepository = ebmConfigRepository;
        this.ebmReceiptRepository = ebmReceiptRepository;
        this.ebmAuditService = ebmAuditService;
    }

    @Async
    @Transactional
    public void submitToEbm(String tenantId, String posTransactionId, BigDecimal grossAmount,
                            BigDecimal vatAmount, String currencyCode) {
        UUID tid = UUID.fromString(tenantId);
        Optional<EbmConfig> config = ebmConfigRepository.findByTenantId(tid);
        if (config.isEmpty() || !config.get().isActive()) {
            log.debug("EBM not configured for tenant {} — skipping", tenantId);
            return;
        }

        BigDecimal netAmount = grossAmount.subtract(vatAmount);
        EbmReceipt receipt = new EbmReceipt();
        receipt.setId(UUID.randomUUID());
        receipt.setTenantId(tid);
        receipt.setPosTransactionId(posTransactionId);
        receipt.setTransactionDate(Instant.now());
        receipt.setNetAmount(netAmount);
        receipt.setVatAmount(vatAmount);
        receipt.setGrossAmount(grossAmount);
        receipt.setCurrencyCode(currencyCode != null ? currencyCode : "RWF");
        receipt.setStatus("PENDING");
        receipt.setRetryCount(0);
        receipt.setCreatedAt(Instant.now());
        receipt = ebmReceiptRepository.save(receipt);

        try {
            receipt.setSubmittedAt(Instant.now());
            EbmApiResponse response = callEbmApi(config.get(), receipt);
            receipt.setEbmReceiptNumber(response.receiptNumber());
            receipt.setEbmSignature(response.signature());
            receipt.setInvoiceNumber(response.invoiceNumber());
            receipt.setStatus("CONFIRMED");
            receipt.setConfirmedAt(Instant.now());
        } catch (Exception e) {
            log.error("EBM submission failed for transaction {}", posTransactionId, e);
            receipt.setStatus("FAILED");
            receipt.setErrorMessage(e.getMessage());
            int retries = receipt.getRetryCount() == null ? 0 : receipt.getRetryCount();
            receipt.setRetryCount(retries + 1);
        }
        ebmReceiptRepository.save(receipt);
    }

    @Scheduled(fixedDelay = 900000)
    @Transactional
    public void retryFailedSubmissions() {
        List<EbmReceipt> failed = ebmReceiptRepository.findByStatusAndRetryCountLessThan("FAILED", 5);
        for (EbmReceipt receipt : failed) {
            Optional<EbmConfig> config = ebmConfigRepository.findByTenantId(receipt.getTenantId());
            if (config.isEmpty()) {
                continue;
            }
            try {
                receipt.setSubmittedAt(Instant.now());
                EbmApiResponse response = callEbmApi(config.get(), receipt);
                receipt.setEbmReceiptNumber(response.receiptNumber());
                receipt.setStatus("CONFIRMED");
                receipt.setConfirmedAt(Instant.now());
            } catch (Exception e) {
                int retries = receipt.getRetryCount() == null ? 0 : receipt.getRetryCount();
                receipt.setRetryCount(retries + 1);
                receipt.setErrorMessage(e.getMessage());
            }
            ebmReceiptRepository.save(receipt);
        }
    }

    @Transactional(readOnly = true)
    public EbmComplianceReport getComplianceReport(String tenantId, String period) {
        UUID tid = UUID.fromString(tenantId);
        YearMonth ym = YearMonth.parse(period);
        Instant from = ym.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = ym.atEndOfMonth().atTime(23, 59, 59).toInstant(ZoneOffset.UTC);

        long total = ebmReceiptRepository.countByTenantIdAndTransactionDateBetween(tid, from, to);
        long confirmed = ebmReceiptRepository.countByTenantIdAndStatusAndTransactionDateBetween(
            tid, "CONFIRMED", from, to);
        long failed = ebmReceiptRepository.countByTenantIdAndStatusAndTransactionDateBetween(
            tid, "FAILED", from, to);
        long pending = ebmReceiptRepository.countByTenantIdAndStatusAndTransactionDateBetween(
            tid, "PENDING", from, to);
        double coverageRate = total > 0 ? (double) confirmed / total * 100.0 : 0.0;
        return new EbmComplianceReport(period, total, confirmed, failed, pending, coverageRate, coverageRate >= 99.0);
    }

    public EbmConfig saveConfig(EbmConfigRequest request) {
        UUID tid = requireTenant();
        EbmConfig config = ebmConfigRepository.findByTenantId(tid).orElseGet(EbmConfig::new);
        if (config.getId() == null) {
            config.setId(UUID.randomUUID());
            config.setTenantId(tid);
            config.setCreatedAt(Instant.now());
        }
        config.setEbmTin(request.ebmTin());
        config.setEbmDeviceSerial(request.ebmDeviceSerial());
        config.setEbmApiUrl(request.ebmApiUrl());
        config.setEbmApiKey(request.ebmApiKey());
        config.setIsActive(request.isActive() == null || request.isActive());
        return ebmConfigRepository.save(config);
    }

    @Transactional(readOnly = true)
    public Optional<EbmConfig> getConfig() {
        return ebmConfigRepository.findByTenantId(requireTenant());
    }

    @Transactional(readOnly = true)
    public Page<EbmReceipt> getReceipts(String status, Pageable pageable) {
        UUID tid = requireTenant();
        if (status == null || status.isBlank()) {
            return ebmReceiptRepository.findByTenantIdOrderByCreatedAtDesc(tid, pageable);
        }
        return ebmReceiptRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(tid, status, pageable);
    }

    /**
     * Synchronous EFD submit for mobile POS (idempotent per sales order id).
     * Uses tenant EBM config when active; otherwise returns mock fiscal payload.
     */
    @Transactional
    public Map<String, String> submitSaleForMobile(String salesOrderId,
                                                   BigDecimal grossAmount,
                                                   BigDecimal vatAmount,
                                                   String currencyCode) {
        UUID tid = requireTenant();
        Optional<EbmConfig> config = ebmConfigRepository.findByTenantId(tid);
        if (config.isEmpty() || !config.get().isActive()) {
            return mockFiscalMap(salesOrderId, grossAmount, vatAmount);
        }

        BigDecimal netAmount = grossAmount.subtract(vatAmount);
        EbmReceipt receipt = new EbmReceipt();
        receipt.setId(UUID.randomUUID());
        receipt.setTenantId(tid);
        receipt.setPosTransactionId(salesOrderId);
        receipt.setTransactionDate(Instant.now());
        receipt.setNetAmount(netAmount);
        receipt.setVatAmount(vatAmount);
        receipt.setGrossAmount(grossAmount);
        receipt.setCurrencyCode(currencyCode != null ? currencyCode : "RWF");
        receipt.setStatus("PENDING");
        receipt.setRetryCount(0);
        receipt.setCreatedAt(Instant.now());
        receipt = ebmReceiptRepository.save(receipt);

        try {
            receipt.setSubmittedAt(Instant.now());
            EbmApiResponse response = callEbmApi(config.get(), receipt);
            receipt.setEbmReceiptNumber(response.receiptNumber());
            receipt.setEbmSignature(response.signature());
            receipt.setInvoiceNumber(response.invoiceNumber());
            receipt.setStatus("CONFIRMED");
            receipt.setConfirmedAt(Instant.now());
            ebmReceiptRepository.save(receipt);
            Map<String, String> out = new LinkedHashMap<>();
            out.put("fiscalSignature", response.signature() != null ? response.signature() : "");
            out.put("fiscalQrData", buildQrData(config.get().getEbmTin(), salesOrderId, grossAmount, vatAmount,
                response.signature()));
            out.put("mode", "live");
            return out;
        } catch (Exception e) {
            receipt.setStatus("FAILED");
            receipt.setErrorMessage(e.getMessage());
            ebmReceiptRepository.save(receipt);
            throw e;
        }
    }

    private static Map<String, String> mockFiscalMap(String salesOrderId, BigDecimal gross, BigDecimal vat) {
        String signature = "RRA-MOCK-SIG-" + salesOrderId.replace("-", "").substring(0, Math.min(16, salesOrderId.length()));
        String qr = "RRA|TX=" + salesOrderId
            + "|AMT=" + gross.stripTrailingZeros().toPlainString()
            + "|VAT=" + vat.stripTrailingZeros().toPlainString()
            + "|SIG=" + signature;
        Map<String, String> out = new LinkedHashMap<>();
        out.put("fiscalSignature", signature);
        out.put("fiscalQrData", qr);
        out.put("mode", "mock");
        return out;
    }

    private static String buildQrData(String tin, String invoice, BigDecimal gross, BigDecimal vat, String signature) {
        String t = tin != null ? tin : "000000000";
        String sig = signature != null ? signature : "";
        return String.join("|",
            t,
            invoice,
            gross.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString(),
            vat.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString(),
            Instant.now().toString().substring(0, 10),
            sig);
    }

    public EbmReceipt retryReceipt(UUID receiptId) {
        UUID tid = requireTenant();
        EbmReceipt receipt = ebmReceiptRepository.findByIdAndTenantId(receiptId, tid)
            .orElseThrow(() -> new IllegalArgumentException("Receipt not found"));
        EbmConfig config = ebmConfigRepository.findByTenantId(tid)
            .orElseThrow(() -> new IllegalArgumentException("EBM not configured"));
        EbmApiResponse response = callEbmApi(config, receipt);
        receipt.setEbmReceiptNumber(response.receiptNumber());
        receipt.setStatus("CONFIRMED");
        receipt.setConfirmedAt(Instant.now());
        return ebmReceiptRepository.save(receipt);
    }

    private EbmApiResponse callEbmApi(EbmConfig config, EbmReceipt receipt) {
        Map<String, Object> payload = Map.of(
            "tin", config.getEbmTin(),
            "deviceSerial", config.getEbmDeviceSerial(),
            "transactionDate", receipt.getTransactionDate().toString(),
            "netAmount", receipt.getNetAmount(),
            "vatAmount", receipt.getVatAmount(),
            "grossAmount", receipt.getGrossAmount(),
            "currency", receipt.getCurrencyCode()
        );
        try {
            EbmApiResponse response = restClient.post()
                .uri(config.getEbmApiUrl() + "/receipts")
                .header("X-API-Key", config.getEbmApiKey() != null ? config.getEbmApiKey() : "")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(EbmApiResponse.class);
            ebmAuditService.record(receipt.getTenantId(), receipt.getId(), payload, response, "SUCCESS", null);
            return response;
        } catch (Exception ex) {
            ebmAuditService.record(receipt.getTenantId(), receipt.getId(), payload, null, "FAILED", ex.getMessage());
            throw ex;
        }
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
