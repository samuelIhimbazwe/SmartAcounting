package com.smartaccounting.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.entity.PosPaymentTender;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.repository.MobileMoneySettlementDedupRepository;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.ReconciliationMatchItemRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import com.smartaccounting.service.MobileMoneyIngressService;
import com.smartaccounting.service.MobileMoneyReconciliationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class MobileMoneyAutoReconciliationIT extends AbstractPostgresSpringBootIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private MobileMoneyIngressService ingressService;
    @Autowired
    private MobileMoneyReconciliationService reconciliationService;
    @Autowired
    private SalesOrderRepository salesOrderRepository;
    @Autowired
    private PosPaymentTenderRepository posPaymentTenderRepository;
    @Autowired
    private ReconciliationMatchItemRepository reconciliationMatchItemRepository;
    @Autowired
    private MobileMoneySettlementDedupRepository dedupRepository;

    @Test
    void successfulMatchWrongReferenceUnmatchedAndDuplicateIdempotent() throws Exception {
        UUID tenantId = UUID.randomUUID();

        SalesOrder order = new SalesOrder();
        order.setId(UUID.randomUUID());
        order.setTenantId(tenantId);
        order.setCustomerName("Walk-in");
        order.setStatus("PAID");
        order.setTotalAmount(new BigDecimal("500.00"));
        order.setCurrencyCode("RWF");
        order.setSalesChannel("POS");
        order.setPosRegisterCode("REG-1");
        order.setCreatedAt(Instant.now());
        salesOrderRepository.save(order);

        PosPaymentTender tender = new PosPaymentTender();
        tender.setId(UUID.randomUUID());
        tender.setTenantId(tenantId);
        tender.setSalesOrderId(order.getId());
        tender.setTenderType("MOMO");
        tender.setAmount(new BigDecimal("500.00"));
        tender.setReference("TXN-SUCCESS-1");
        tender.setReconciliationStatus("PENDING");
        tender.setCreatedAt(Instant.now());
        posPaymentTenderRepository.save(tender);

        JsonNode successPayload = objectMapper.readTree("""
            {
              "financialTransactionId":"TXN-SUCCESS-1",
              "status":"SUCCESSFUL",
              "amount":"500.00",
              "currency":"RWF"
            }
            """);
        MobileMoneyIngressService.IngressOutcome successIngress =
            ingressService.parse(MobileMoneyReconciliationService.PROVIDER_MTN, successPayload, tenantId);
        Map<String, Object> successOut = reconciliationService.settle(MobileMoneyReconciliationService.PROVIDER_MTN, successIngress.request());
        assertEquals("MATCHED", successOut.get("outcome"));
        PosPaymentTender reconciled = posPaymentTenderRepository.findById(tender.getId()).orElseThrow();
        assertEquals("RECONCILED", reconciled.getReconciliationStatus());

        JsonNode wrongRefPayload = objectMapper.readTree("""
            {
              "referenceId":"TXN-NO-MATCH-404",
              "status":"SUCCESSFUL",
              "amount":"700.00",
              "currency":"RWF"
            }
            """);
        MobileMoneyIngressService.IngressOutcome wrongIngress =
            ingressService.parse(MobileMoneyReconciliationService.PROVIDER_MTN, wrongRefPayload, tenantId);
        Map<String, Object> wrongOut = reconciliationService.settle(MobileMoneyReconciliationService.PROVIDER_MTN, wrongIngress.request());
        assertEquals("NOT_FOUND", wrongOut.get("outcome"));

        UUID unmatchedId = UUID.nameUUIDFromBytes(
            ("mobile-money-unmatched:MTN:TXN-NO-MATCH-404").getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );
        assertEquals(1L, reconciliationMatchItemRepository
            .countByTenantIdAndItemTypeAndItemIdAndMatchedFalse(tenantId, "MOBILE_MONEY_CALLBACK", unmatchedId));

        Map<String, Object> duplicateOut = reconciliationService.settle(MobileMoneyReconciliationService.PROVIDER_MTN, wrongIngress.request());
        assertEquals("NOT_FOUND", duplicateOut.get("outcome"));
        assertTrue((Boolean) duplicateOut.get("replay"));
        assertEquals(1L, reconciliationMatchItemRepository
            .countByTenantIdAndItemTypeAndItemIdAndMatchedFalse(tenantId, "MOBILE_MONEY_CALLBACK", unmatchedId));
        assertTrue(dedupRepository.findByTenantIdAndProviderAndExternalId(tenantId, "MTN", "TXN-NO-MATCH-404").isPresent());
    }
}
