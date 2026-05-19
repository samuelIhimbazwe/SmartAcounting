package com.smartaccounting.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Rwanda RRA eBMS / EFD submission facade.
 * Real wire format must be confirmed with RRA before production.
 */
@Service
public class RraEfdService {
    private static final Logger log = LoggerFactory.getLogger(RraEfdService.class);

    private final EbmService ebmService;

    public RraEfdService(EbmService ebmService) {
        this.ebmService = ebmService;
    }

    /**
     * RRA_API_TODO: confirm endpoint, auth method, and payload schema for eBMS/EFD POST.
     */
    @Async
    public void submitSaleAsync(UUID tenantId,
                                String salesOrderId,
                                BigDecimal grossAmount,
                                BigDecimal vatAmount,
                                String currencyCode,
                                boolean taxExempt) {
        if (taxExempt) {
            log.debug("Tax-exempt sale {} — EFD submission skipped", salesOrderId);
            return;
        }
        ebmService.submitToEbm(tenantId.toString(), salesOrderId, grossAmount, vatAmount, currencyCode);
    }

    /**
     * RRA_API_TODO: Replace mock signature/QR with values returned by the real EFD API.
     */
    public Map<String, String> mockFiscalPayload(UUID salesOrderId, BigDecimal gross, BigDecimal vat) {
        String signature = "RRA-MOCK-SIG-" + salesOrderId.toString().replace("-", "").substring(0, 16);
        String qr = "RRA|TX=" + salesOrderId
            + "|AMT=" + gross.stripTrailingZeros().toPlainString()
            + "|VAT=" + vat.stripTrailingZeros().toPlainString()
            + "|SIG=" + signature;
        Map<String, String> out = new LinkedHashMap<>();
        out.put("fiscalSignature", signature);
        out.put("fiscalQrData", qr);
        return out;
    }
}
