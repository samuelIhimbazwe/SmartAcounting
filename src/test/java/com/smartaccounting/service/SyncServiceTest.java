package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.config.PosProperties;
import com.smartaccounting.dto.PosCheckoutRequest;
import com.smartaccounting.dto.SyncOperationRequest;
import com.smartaccounting.entity.InventoryBalance;
import com.smartaccounting.entity.PosCatalogItem;
import com.smartaccounting.entity.SyncQueueItem;
import com.smartaccounting.repository.InventoryBalanceRepository;
import com.smartaccounting.repository.PosCatalogItemRepository;
import com.smartaccounting.repository.SyncQueueRepository;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SyncServiceTest {

    @Mock private SyncQueueRepository repository;
    @Mock private AuditService auditService;
    @Mock private PosCheckoutService posCheckoutService;
    @Mock private MobileMoneyReconciliationService mobileMoneyReconciliationService;
    @Mock private PosCatalogItemRepository posCatalogItemRepository;
    @Mock private InventoryBalanceRepository inventoryBalanceRepository;
    @Mock private CurrencyService currencyService;

    private SyncService service;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UUID tenant = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private final UUID user = UUID.fromString("20000000-0000-0000-0000-000000000002");

    @BeforeEach
    void setUp() {
        PosProperties posProps = new PosProperties();
        posProps.setDefaultInventoryLocation("SHOP");
        service = new SyncService(
            repository,
            objectMapper,
            auditService,
            posCheckoutService,
            mobileMoneyReconciliationService,
            posCatalogItemRepository,
            inventoryBalanceRepository,
            currencyService,
            posProps
        );
        TenantContext.set(tenant, user);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void enqueueBatchSkipsDuplicatesByIdempotencyKey() {
        UUID device = UUID.fromString("30000000-0000-0000-0000-000000000003");
        SyncOperationRequest first = new SyncOperationRequest(
            device, "k-1", "POS_SALE", "SALES_ORDER",
            Map.of("currencyCode", "RWF", "lines", List.of(), "tenders", List.of()), 1L, null
        );
        SyncOperationRequest dup = new SyncOperationRequest(
            device, "k-dup", "POS_SALE", "SALES_ORDER",
            Map.of("currencyCode", "RWF", "lines", List.of(), "tenders", List.of()), 2L, null
        );
        when(repository.existsByTenantIdAndDeviceIdAndIdempotencyKey(tenant, device, "k-1")).thenReturn(false);
        when(repository.existsByTenantIdAndDeviceIdAndIdempotencyKey(tenant, device, "k-dup")).thenReturn(true);
        when(repository.save(any(SyncQueueItem.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> out = service.enqueueBatch(List.of(first, dup));

        assertThat(out.get("queued")).isEqualTo(1);
        assertThat(out.get("duplicates")).isEqualTo(1);
        @SuppressWarnings("unchecked")
        List<UUID> ids = (List<UUID>) out.get("syncIds");
        assertThat(ids).hasSize(1);
        verify(repository).save(any(SyncQueueItem.class));
    }

    @Test
    void flushPendingFlagsOutOfStockLineAndContinuesRemainingLines() throws Exception {
        UUID device = UUID.fromString("31000000-0000-0000-0000-000000000003");
        SyncQueueItem q = new SyncQueueItem();
        q.setId(UUID.fromString("32000000-0000-0000-0000-000000000003"));
        q.setTenantId(tenant);
        q.setDeviceId(device);
        q.setOperationType("POS_SALE");
        q.setStatus("PENDING");
        q.setLamportClock(10L);
        q.setPayload(objectMapper.writeValueAsString(Map.of(
            "customerName", "Walk-in",
            "currencyCode", "RWF",
            "posRegisterCode", "REG-01",
            "lines", List.of(
                Map.of("barcode", "OK1", "quantity", "1"),
                Map.of("barcode", "LOW2", "quantity", "2")
            ),
            "tenders", List.of(
                Map.of("tenderType", "CASH", "amount", "300")
            )
        )));
        when(repository.findTop200ByTenantIdAndStatusOrderByLamportClockAsc(tenant, "PENDING")).thenReturn(List.of(q));

        PosCatalogItem ok = new PosCatalogItem();
        ok.setId(UUID.randomUUID());
        ok.setTenantId(tenant);
        ok.setBarcode("OK1");
        ok.setProductId(UUID.fromString("41000000-0000-0000-0000-000000000004"));
        ok.setCurrencyCode("RWF");
        ok.setUnitPrice(new BigDecimal("100"));
        PosCatalogItem low = new PosCatalogItem();
        low.setId(UUID.randomUUID());
        low.setTenantId(tenant);
        low.setBarcode("LOW2");
        low.setProductId(UUID.fromString("42000000-0000-0000-0000-000000000004"));
        low.setCurrencyCode("RWF");
        low.setUnitPrice(new BigDecimal("100"));
        when(posCatalogItemRepository.findByTenantIdAndBarcodeAndActiveTrue(tenant, "OK1")).thenReturn(Optional.of(ok));
        when(posCatalogItemRepository.findByTenantIdAndBarcodeAndActiveTrue(tenant, "LOW2")).thenReturn(Optional.of(low));

        InventoryBalance b1 = new InventoryBalance();
        b1.setQuantity(new BigDecimal("10"));
        InventoryBalance b2 = new InventoryBalance();
        b2.setQuantity(new BigDecimal("1"));
        when(inventoryBalanceRepository.findByTenantIdAndProductIdAndLocationCode(tenant, ok.getProductId(), "SHOP"))
            .thenReturn(Optional.of(b1));
        when(inventoryBalanceRepository.findByTenantIdAndProductIdAndLocationCode(tenant, low.getProductId(), "SHOP"))
            .thenReturn(Optional.of(b2));
        when(posCheckoutService.checkout(any(PosCheckoutRequest.class))).thenReturn(Map.of("salesOrderId", UUID.randomUUID()));

        int processed = service.flushPending();

        assertThat(processed).isEqualTo(1);
        assertThat(q.getStatus()).isEqualTo("SYNCED_WITH_CONFLICT");
        assertThat(q.getErrorMessage()).contains("LOW2").contains("INSUFFICIENT_STOCK");
        assertThat(q.getSyncedAt()).isNotNull();

        ArgumentCaptor<PosCheckoutRequest> reqCap = ArgumentCaptor.forClass(PosCheckoutRequest.class);
        verify(posCheckoutService).checkout(reqCap.capture());
        assertThat(reqCap.getValue().lines()).hasSize(1);
        assertThat(reqCap.getValue().lines().get(0).barcode()).isEqualTo("OK1");
        verify(repository).saveAll(any());
    }
}
