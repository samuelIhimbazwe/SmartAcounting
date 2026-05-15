package com.smartaccounting.service;

import com.smartaccounting.dto.CreatePromotionRequest;
import com.smartaccounting.dto.PromotionProductRequest;
import com.smartaccounting.entity.Promotion;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Creates short-lived percentage-off promotions for batches nearing expiry (markdown workflow).
 */
@Service
public class ExpiryMarkdownService {
    private final InventoryService inventoryService;
    private final PromotionService promotionService;

    public ExpiryMarkdownService(InventoryService inventoryService, PromotionService promotionService) {
        this.inventoryService = inventoryService;
        this.promotionService = promotionService;
    }

    @Transactional
    public List<Promotion> createExpiryMarkdownPromotions(int daysAhead, BigDecimal discountPercent, UUID createdBy) {
        requireTenant();
        int ahead = daysAhead > 0 ? daysAhead : 7;
        BigDecimal rate = discountPercent != null && discountPercent.signum() > 0
            ? discountPercent : new BigDecimal("0.15");
        if (rate.compareTo(BigDecimal.ONE) > 0) {
            rate = rate.divide(new BigDecimal("100"), 4, java.math.RoundingMode.HALF_UP);
        }

        Instant start = Instant.now();
        Instant end = start.plus(ahead, ChronoUnit.DAYS);
        List<Promotion> created = new ArrayList<>();

        for (Map<String, Object> batch : inventoryService.expiryRisk("SHOP", ahead)) {
            Object productIdObj = batch.get("productId");
            if (productIdObj == null) {
                continue;
            }
            UUID productId = productIdObj instanceof UUID u ? u : UUID.fromString(productIdObj.toString());
            String sku = batch.get("sku") != null ? batch.get("sku").toString() : productId.toString();
            String name = batch.get("name") != null ? batch.get("name").toString() : sku;
            Object daysObj = batch.get("daysUntilExpiry");
            String suffix = daysObj != null ? " (" + daysObj + "d left)" : "";

            Promotion promo = promotionService.createPromotion(
                new CreatePromotionRequest(
                    "Expiry markdown: " + name + suffix,
                    "Auto markdown for stock expiring within " + ahead + " days",
                    "PERCENTAGE_OFF",
                    rate,
                    null,
                    null,
                    null,
                    "SPECIFIC_PRODUCTS",
                    null,
                    start,
                    end,
                    BigDecimal.ZERO,
                    null,
                    null,
                    List.of(new PromotionProductRequest(productId, sku, name))
                ),
                createdBy
            );
            created.add(promotionService.updateStatus(promo.getId(), "ACTIVE"));
        }
        return created;
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
