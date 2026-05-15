package com.smartaccounting.service;

import com.smartaccounting.config.ReceiptProperties;
import com.smartaccounting.entity.PosCatalogItem;
import com.smartaccounting.entity.PosPaymentTender;
import com.smartaccounting.entity.PosSaleLine;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.repository.PosCatalogItemRepository;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.PosSaleLineRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PosReceiptServiceTest {

    @Mock private SalesOrderRepository salesOrderRepository;
    @Mock private PosSaleLineRepository saleLineRepository;
    @Mock private PosPaymentTenderRepository tenderRepository;
    @Mock private PosCatalogItemRepository catalogRepository;
    @Mock private SmsDispatchService smsDispatchService;

    private PosReceiptService service;
    private final UUID tenant = UUID.fromString("10000000-0000-0000-0000-000000000010");
    private final UUID user = UUID.fromString("20000000-0000-0000-0000-000000000020");

    @BeforeEach
    void setUp() {
        ReceiptProperties props = new ReceiptProperties();
        props.setStoreName("SMARTCHAIN");
        props.setStoreAddress("Kigali");
        props.setFooterText("Thank you.");
        props.setPrinterType("thermal");
        service = new PosReceiptService(
            salesOrderRepository, saleLineRepository, tenderRepository, catalogRepository, smsDispatchService, props
        );
        TenantContext.set(tenant, user);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void printBuildsEscPosAndSendsSmsForMomoTenders() {
        UUID orderId = UUID.fromString("30000000-0000-0000-0000-000000000030");
        SalesOrder order = new SalesOrder();
        order.setId(orderId);
        order.setTenantId(tenant);
        order.setSalesChannel("POS");
        order.setCurrencyCode("RWF");
        order.setTotalAmount(new BigDecimal("1000"));
        order.setCreatedAt(Instant.parse("2026-05-05T10:00:00Z"));
        when(salesOrderRepository.findById(orderId)).thenReturn(Optional.of(order));

        PosSaleLine line = new PosSaleLine();
        line.setCatalogItemId(UUID.fromString("40000000-0000-0000-0000-000000000040"));
        line.setBarcodeSnapshot("BC-1");
        line.setQuantity(new BigDecimal("2"));
        line.setUnitPrice(new BigDecimal("500"));
        line.setLineTotal(new BigDecimal("1000"));
        when(saleLineRepository.findByTenantIdAndSalesOrderIdOrderByIdAsc(tenant, orderId)).thenReturn(List.of(line));

        PosCatalogItem item = new PosCatalogItem();
        item.setId(line.getCatalogItemId());
        item.setSku("SKU-123");
        when(catalogRepository.findAllById(org.mockito.ArgumentMatchers.<Iterable<UUID>>any())).thenReturn(List.of(item));

        PosPaymentTender tender = new PosPaymentTender();
        tender.setTenderType("MOMO");
        tender.setAmount(new BigDecimal("1000"));
        tender.setReference("TXN-ABC");
        tender.setPayerPhone("+250788000000");
        when(tenderRepository.findByTenantIdAndSalesOrderIdOrderByCreatedAtAsc(tenant, orderId)).thenReturn(List.of(tender));
        when(smsDispatchService.send(eq(tenant), any(UUID.class), eq("POS_RECEIPT"), eq(List.of("+250788000000")), any(String.class)))
            .thenReturn(1);

        var out = service.print(orderId, false);

        assertThat(out.get("transactionId")).isEqualTo(orderId);
        assertThat((String) out.get("escPos")).contains("SKU", "SKU-123", "Cashier", "Txn Ref: TXN-ABC", "TOTAL: 1000.00 RWF");
        assertThat(out.get("smsReceiptsSent")).isEqualTo(1);
        verify(smsDispatchService).send(eq(tenant), any(UUID.class), eq("POS_RECEIPT"), eq(List.of("+250788000000")), any(String.class));
    }
}
