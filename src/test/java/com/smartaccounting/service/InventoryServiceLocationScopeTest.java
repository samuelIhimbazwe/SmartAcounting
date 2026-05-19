package com.smartaccounting.service;

import com.smartaccounting.config.PosProperties;
import com.smartaccounting.entity.InventoryBalance;
import com.smartaccounting.events.DomainEventPublisher;
import com.smartaccounting.repository.InventoryBalanceRepository;
import com.smartaccounting.repository.ProductRepository;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryServiceLocationScopeTest {

    private static final UUID TENANT = UUID.randomUUID();
    private static final UUID WATER = UUID.fromString("22222222-2222-4222-8222-222222222201");

    @Mock
    private InventoryBalanceRepository inventoryBalanceRepository;
    @Mock
    private EventLogService eventLogService;
    @Mock
    private DomainEventPublisher eventPublisher;
    @Mock
    private com.smartaccounting.repository.InventoryBatchRepository inventoryBatchRepository;
    @Mock
    private com.smartaccounting.repository.StockMovementRepository stockMovementRepository;
    @Mock
    private PosProperties posProperties;
    @Mock
    private com.smartaccounting.repository.PosCatalogItemRepository posCatalogItemRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private PushNotificationService pushNotificationService;

    @InjectMocks
    private InventoryService inventoryService;

    @BeforeEach
    void tenant() {
        TenantContext.set(TENANT, UUID.randomUUID());
    }

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    @Test
    void listBalancesUsesLocationCodeQueryNotHeaderContext() {
        InventoryBalance shop = balance("SHOP", new BigDecimal("120"));
        InventoryBalance branch = balance("BRANCH_B", new BigDecimal("40"));
        when(inventoryBalanceRepository.findByTenantIdAndLocationCodeOrderByProductIdAsc(TENANT, "SHOP"))
            .thenReturn(List.of(shop));
        when(inventoryBalanceRepository.findByTenantIdAndLocationCodeOrderByProductIdAsc(TENANT, "BRANCH_B"))
            .thenReturn(List.of(branch));

        BigDecimal shopQty = qty(inventoryService.listBalances("SHOP"));
        BigDecimal branchQty = qty(inventoryService.listBalances("BRANCH_B"));

        assertNotEquals(0, shopQty.compareTo(branchQty));
        verify(inventoryBalanceRepository).findByTenantIdAndLocationCodeOrderByProductIdAsc(eq(TENANT), eq("SHOP"));
        verify(inventoryBalanceRepository).findByTenantIdAndLocationCodeOrderByProductIdAsc(eq(TENANT), eq("BRANCH_B"));
    }

    private static InventoryBalance balance(String location, BigDecimal qty) {
        InventoryBalance b = new InventoryBalance();
        b.setProductId(WATER);
        b.setLocationCode(location);
        b.setQuantity(qty);
        return b;
    }

    private static BigDecimal qty(List<Map<String, Object>> rows) {
        return (BigDecimal) rows.getFirst().get("quantity");
    }
}
