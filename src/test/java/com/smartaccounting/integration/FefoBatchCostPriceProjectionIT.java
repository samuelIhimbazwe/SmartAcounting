package com.smartaccounting.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dashboard.IncrementalProjectionService;
import com.smartaccounting.dto.CreatePosCatalogItemRequest;
import com.smartaccounting.dto.PosCheckoutLineRequest;
import com.smartaccounting.dto.PosCheckoutRequest;
import com.smartaccounting.dto.PosTenderRequest;
import com.smartaccounting.dto.ReceiveStockRequest;
import com.smartaccounting.entity.PosSaleLine;
import com.smartaccounting.entity.Product;
import com.smartaccounting.repository.PosSaleLineRepository;
import com.smartaccounting.repository.ProductRepository;
import com.smartaccounting.repository.SalesKpiSnapshotJdbcRepository;
import com.smartaccounting.service.InventoryService;
import com.smartaccounting.service.PosCheckoutService;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class FefoBatchCostPriceProjectionIT extends AbstractPostgresSpringBootIntegrationTest {

    @Autowired
    private InventoryService inventoryService;
    @Autowired
    private PosCheckoutService posCheckoutService;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private PosSaleLineRepository posSaleLineRepository;
    @Autowired
    private IncrementalProjectionService incrementalProjectionService;
    @Autowired
    private SalesKpiSnapshotJdbcRepository salesKpiSnapshotJdbcRepository;
    @Autowired
    private ObjectMapper objectMapper;

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void fefoUsesBatchCostAndProjectionUsesHistoricalCosts() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantContext.set(tenantId, UUID.randomUUID());

        Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setTenantId(tenantId);
        product.setName("Cooking Oil");
        product.setSku("OIL-1L");
        product.setUnit("EA");
        product.setBarcode("111222333");
        product.setCreatedAt(java.time.Instant.now());
        productRepository.save(product);

        posCheckoutService.upsertCatalogItem(new CreatePosCatalogItemRequest(
            product.getBarcode(),
            product.getSku(),
            product.getName(),
            new BigDecimal("100.00"),
            "RWF",
            product.getId(),
            new BigDecimal("2")
        ));

        inventoryService.receiveStock(new ReceiveStockRequest(
            product.getId(),
            "SHOP",
            new BigDecimal("3"),
            new BigDecimal("40.00"),
            "GRN-001",
            "LOT-OLD",
            LocalDate.now().plusDays(10)
        ));
        inventoryService.receiveStock(new ReceiveStockRequest(
            product.getId(),
            "SHOP",
            new BigDecimal("4"),
            new BigDecimal("70.00"),
            "GRN-002",
            "LOT-NEW",
            LocalDate.now().plusDays(60)
        ));

        var out = posCheckoutService.checkout(new PosCheckoutRequest(
            "Walk-in",
            "RWF",
            "REG-A",
            List.of(new PosCheckoutLineRequest(product.getBarcode(), new BigDecimal("5"))),
            List.of(new PosTenderRequest("CASH", new BigDecimal("500.00"), null)),
            null,
            false,
            null,
            null
        ));

        UUID salesOrderId = UUID.fromString(String.valueOf(out.get("salesOrderId")));
        List<PosSaleLine> lines = posSaleLineRepository.findByTenantIdAndSalesOrderIdOrderByIdAsc(tenantId, salesOrderId);
        assertEquals(2, lines.size());

        lines = lines.stream().sorted(Comparator.comparing(PosSaleLine::getCostPrice)).toList();
        assertEquals(0, lines.get(0).getCostPrice().compareTo(new BigDecimal("40.00")));
        assertEquals(0, lines.get(0).getQuantity().compareTo(new BigDecimal("3.0000")));
        assertEquals(0, lines.get(1).getCostPrice().compareTo(new BigDecimal("70.00")));
        assertEquals(0, lines.get(1).getQuantity().compareTo(new BigDecimal("2.0000")));

        incrementalProjectionService.refreshTenant(tenantId);
        String payload = salesKpiSnapshotJdbcRepository.findTodayPayload(tenantId).orElseThrow();
        JsonNode json = objectMapper.readTree(payload);
        BigDecimal grossMargin = json.get("grossMargin").decimalValue().setScale(2);
        BigDecimal expected = new BigDecimal("240.00");
        assertEquals(0, grossMargin.compareTo(expected));
        assertTrue(json.get("historicalCogs").decimalValue().compareTo(new BigDecimal("260.00")) == 0);
    }
}
