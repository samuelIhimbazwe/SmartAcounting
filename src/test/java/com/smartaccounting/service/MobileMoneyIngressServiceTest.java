package com.smartaccounting.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dto.MobileMoneyCallbackRequest;
import com.smartaccounting.entity.PosPaymentTender;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MobileMoneyIngressServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private PosPaymentTenderRepository tenderRepository;
    @Mock
    private SalesOrderRepository salesOrderRepository;

    private MobileMoneyIngressService service;

    @BeforeEach
    void setUp() {
        service = new MobileMoneyIngressService(objectMapper, tenderRepository, salesOrderRepository);
    }

    @Test
    void canonicalPayloadPassesThrough() throws Exception {
        UUID tenant = UUID.randomUUID();
        JsonNode root = objectMapper.readTree("""
            {"tenantId":"%s","transactionId":"T1","amount":"100.00","currencyCode":"RWF"}
            """.formatted(tenant));

        MobileMoneyIngressService.IngressOutcome out = service.parse(MobileMoneyReconciliationService.PROVIDER_MTN, root, null);

        assertThat(out.skipped()).isFalse();
        assertThat(out.request().tenantId()).isEqualTo(tenant);
        assertThat(out.request().transactionId()).isEqualTo("T1");
        assertThat(out.request().amount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(out.request().currencyCode()).isEqualTo("RWF");
    }

    @Test
    void mtnMinimalCallbackUsesTenantQueryAndInfersAmountFromPos() {
        UUID tenant = UUID.fromString("10000000-0000-0000-0000-000000000099");
        UUID orderId = UUID.fromString("20000000-0000-0000-0000-000000000088");
        UUID tenderId = UUID.fromString("30000000-0000-0000-0000-000000000077");

        JsonNode root = objectMapper.valueToTree(
            Map.of("referenceId", "REF-MTN-1", "status", "SUCCESSFUL"));

        PosPaymentTender t = new PosPaymentTender();
        t.setId(tenderId);
        t.setTenantId(tenant);
        t.setSalesOrderId(orderId);
        t.setAmount(new BigDecimal("250.00"));
        when(tenderRepository.findFirstByTenantIdAndTenderTypeInAndReferenceEqualsIgnoreCaseOrderByCreatedAtDesc(
            eq(tenant), eq(List.of("MOMO")), eq("REF-MTN-1")
        )).thenReturn(Optional.of(t));

        SalesOrder order = new SalesOrder();
        order.setCurrencyCode("RWF");
        when(salesOrderRepository.findById(orderId)).thenReturn(Optional.of(order));

        MobileMoneyIngressService.IngressOutcome out = service.parse(MobileMoneyReconciliationService.PROVIDER_MTN, root, tenant);

        assertThat(out.skipped()).isFalse();
        MobileMoneyCallbackRequest req = out.request();
        assertThat(req.amount()).isEqualByComparingTo("250.00");
        assertThat(req.currencyCode()).isEqualTo("RWF");
        assertThat(req.transactionId()).isEqualTo("REF-MTN-1");
    }

    @Test
    void failedStatusSkips() throws Exception {
        JsonNode root = objectMapper.readTree("{\"referenceId\":\"X\",\"status\":\"FAILED\"}");
        MobileMoneyIngressService.IngressOutcome out = service.parse(
            MobileMoneyReconciliationService.PROVIDER_MTN, root, UUID.randomUUID());
        assertThat(out.skipped()).isTrue();
        assertThat(out.skipReason()).contains("NON_SUCCESS_STATUS");
    }

    @Test
    void missingTenantThrows() throws Exception {
        JsonNode root = objectMapper.readTree("{\"referenceId\":\"X\",\"status\":\"SUCCESSFUL\"}");
        assertThatThrownBy(() -> service.parse(MobileMoneyReconciliationService.PROVIDER_MTN, root, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("tenantId");
    }
}
