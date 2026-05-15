package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.config.MobileMoneyProperties;
import com.smartaccounting.dto.MobileMoneyCallbackRequest;
import com.smartaccounting.entity.MobileMoneySettlementDedup;
import com.smartaccounting.entity.PosPaymentTender;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.repository.MobileMoneySettlementDedupRepository;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.ReconciliationMatchItemRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MobileMoneyReconciliationServiceTest {

    @Mock
    private PosPaymentTenderRepository tenderRepository;
    @Mock
    private SalesOrderRepository salesOrderRepository;
    @Mock
    private MobileMoneySettlementDedupRepository dedupRepository;
    @Mock
    private ReconciliationMatchItemRepository reconciliationMatchItemRepository;
    @Mock
    private AuditService auditService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MobileMoneyProperties properties;
    private MobileMoneyReconciliationService service;

    @BeforeEach
    void setUp() {
        properties = new MobileMoneyProperties();
        properties.setWebhookActorUserId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        service = new MobileMoneyReconciliationService(
            tenderRepository, salesOrderRepository, dedupRepository, reconciliationMatchItemRepository, objectMapper, auditService, properties
        );
    }

    @Test
    void mtnCallbackMatchesTender() {
        UUID tenant = UUID.fromString("10000000-0000-0000-0000-000000000001");
        UUID orderId = UUID.fromString("20000000-0000-0000-0000-000000000002");
        UUID tenderId = UUID.fromString("30000000-0000-0000-0000-000000000003");
        when(dedupRepository.findByTenantIdAndProviderAndExternalId(tenant, "MTN", "TXN-1"))
            .thenReturn(Optional.empty());

        PosPaymentTender t = new PosPaymentTender();
        t.setId(tenderId);
        t.setTenantId(tenant);
        t.setSalesOrderId(orderId);
        t.setTenderType("MOMO");
        t.setAmount(new BigDecimal("500.00"));
        t.setReference("TXN-1");
        when(tenderRepository.findFirstByTenantIdAndTenderTypeInAndReferenceEqualsIgnoreCaseOrderByCreatedAtDesc(
            tenant, List.of("MOMO"), "TXN-1"
        )).thenReturn(Optional.of(t));

        SalesOrder order = new SalesOrder();
        order.setId(orderId);
        order.setCurrencyCode("RWF");
        when(salesOrderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(dedupRepository.save(any(MobileMoneySettlementDedup.class))).thenAnswer(i -> i.getArgument(0));

        var req = new MobileMoneyCallbackRequest(tenant, "TXN-1", new BigDecimal("500.00"), "RWF", null);
        Map<String, Object> out = service.settle("MTN", req);

        assertThat(out.get("outcome")).isEqualTo("MATCHED");
        assertThat(out.get("replay")).isEqualTo(false);
        verify(auditService).logAction(eq("POS_MOBILE_MONEY_RECONCILED"), eq("POS_PAYMENT_TENDER"), eq("{}"), anyString());

        ArgumentCaptor<PosPaymentTender> cap = ArgumentCaptor.forClass(PosPaymentTender.class);
        verify(tenderRepository).save(cap.capture());
        assertThat(cap.getValue().getReconciliationStatus()).isEqualTo("RECONCILED");
    }

    @Test
    void returnsReplayWhenDedupExists() throws Exception {
        UUID tenant = UUID.randomUUID();
        when(dedupRepository.findByTenantIdAndProviderAndExternalId(tenant, "MTN", "TXN-9")).thenAnswer(inv -> {
            MobileMoneySettlementDedup row = new MobileMoneySettlementDedup();
            row.setResponseJson(objectMapper.writeValueAsString(Map.of(
                "outcome", "NOT_FOUND",
                "provider", "MTN",
                "transactionId", "TXN-9",
                "replay", false
            )));
            return Optional.of(row);
        });

        var req = new MobileMoneyCallbackRequest(tenant, "TXN-9", new BigDecimal("1.00"), "RWF", null);
        Map<String, Object> out = service.settle("MTN", req);

        assertThat(out.get("outcome")).isEqualTo("NOT_FOUND");
        assertThat(out.get("replay")).isEqualTo(true);
        verify(tenderRepository, never()).save(any());
    }
}
