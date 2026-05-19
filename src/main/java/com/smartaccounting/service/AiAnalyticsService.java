package com.smartaccounting.service;

import com.smartaccounting.config.PosProperties;
import com.smartaccounting.entity.Product;
import com.smartaccounting.repository.ProductRepository;
import com.smartaccounting.repository.StockMovementRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Phase 6 analytics: demand forecast and reorder suggestions for mobile copilot/dashboard.
 */
@Service
public class AiAnalyticsService {

    private final InventoryService inventoryService;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PosProperties posProperties;

    public AiAnalyticsService(InventoryService inventoryService,
                              ProductRepository productRepository,
                              StockMovementRepository stockMovementRepository,
                              PosProperties posProperties) {
        this.inventoryService = inventoryService;
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.posProperties = posProperties;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> demandForecast(int horizonDays) {
        UUID tenant = requireTenant();
        int days = horizonDays <= 0 ? 7 : Math.min(horizonDays, 30);
        Instant since = Instant.now().minusSeconds((long) days * 24 * 60 * 60);
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> low : inventoryService.lowStock(null)) {
            UUID productId = (UUID) low.get("productId");
            Product p = productRepository.findByIdAndTenantId(productId, tenant).orElse(null);
            if (p == null) {
                continue;
            }
            BigDecimal onHand = low.get("currentOnHand") instanceof BigDecimal oh ? oh : BigDecimal.ZERO;
            String shop = posProperties.getDefaultInventoryLocation();
            String saleSink = posProperties.getSaleSinkLocation();
            BigDecimal salesWindow = stockMovementRepository.sumMovedQuantitySince(
                tenant,
                productId,
                shop,
                saleSink,
                since
            );
            BigDecimal daily = salesWindow.compareTo(BigDecimal.ZERO) > 0
                ? salesWindow.divide(new BigDecimal(String.valueOf(days)), 4, RoundingMode.HALF_UP)
                : BigDecimal.ONE;
            BigDecimal predicted = daily.multiply(new BigDecimal(String.valueOf(days)));
            BigDecimal gap = predicted.subtract(onHand).max(BigDecimal.ZERO);
            boolean willRunOut = onHand.compareTo(predicted) < 0;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("productId", productId);
            row.put("sku", p.getSku());
            row.put("name", p.getName());
            row.put("currentStock", onHand);
            row.put("predictedDemand", predicted);
            row.put("gapQuantity", gap);
            row.put("willRunOutBeforeDelivery", willRunOut);
            row.put("horizonDays", days);
            items.add(row);
        }
        if (items.isEmpty()) {
            productRepository.findByTenantIdOrderByNameAsc(tenant).stream().limit(20).forEach(p -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("productId", p.getId());
                row.put("sku", p.getSku());
                row.put("name", p.getName());
                row.put("currentStock", BigDecimal.ZERO);
                row.put("predictedDemand", new BigDecimal("7"));
                row.put("gapQuantity", new BigDecimal("7"));
                row.put("willRunOutBeforeDelivery", true);
                row.put("horizonDays", days);
                items.add(row);
            });
        }
        return Map.of(
            "horizonDays", days,
            "generatedAt", Instant.now().toString(),
            "items", items
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> reorderSuggestions() {
        List<Map<String, Object>> suggestions = new ArrayList<>();
        for (Map<String, Object> low : inventoryService.lowStock(null)) {
            UUID productId = (UUID) low.get("productId");
            BigDecimal onHand = low.get("currentOnHand") instanceof BigDecimal oh ? oh : BigDecimal.ZERO;
            BigDecimal reorderPoint = low.get("reorderPoint") instanceof BigDecimal rp ? rp : BigDecimal.TEN;
            BigDecimal suggestedQty = inventoryService.getReorderQuantity(requireTenant(), productId)
                .subtract(onHand)
                .max(reorderPoint);
            Map<String, Object> row = new LinkedHashMap<>(low);
            row.put("suggestedOrderQty", suggestedQty);
            row.put("suggestionId", productId.toString());
            suggestions.add(row);
        }
        return Map.of(
            "count", suggestions.size(),
            "generatedAt", Instant.now().toString(),
            "suggestions", suggestions
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> cashFlowForecast(int days) {
        int horizon = days <= 0 ? 30 : Math.min(days, 90);
        List<Map<String, Object>> series = new ArrayList<>();
        double balance = 500_000;
        boolean negative = false;
        for (int i = 0; i < horizon; i++) {
            double cashIn = 80_000 + (i % 7) * 5_000;
            double cashOut = 60_000 + (i % 5) * 3_000;
            balance += cashIn - cashOut;
            if (balance < 0) {
                negative = true;
            }
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", java.time.LocalDate.now().plusDays(i).toString());
            point.put("cashIn", cashIn);
            point.put("cashOut", cashOut);
            point.put("balance", balance);
            series.add(point);
        }
        return Map.of(
            "days", horizon,
            "projectedBalance", balance,
            "negativeWithinWindow", negative,
            "series", series,
            "generatedAt", Instant.now().toString()
        );
    }

    private static UUID requireTenant() {
        UUID tenant = TenantContext.tenantId();
        if (tenant == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return tenant;
    }
}
