package com.smartaccounting.service;

import com.smartaccounting.dto.ApplicablePromotion;
import com.smartaccounting.dto.CreatePromotionRequest;
import com.smartaccounting.dto.PromotionCartItem;
import com.smartaccounting.dto.PromotionPerformanceReport;
import com.smartaccounting.dto.PromotionProductRequest;
import com.smartaccounting.entity.Promotion;
import com.smartaccounting.entity.PromotionProduct;
import com.smartaccounting.entity.PromotionResult;
import com.smartaccounting.repository.PromotionProductRepository;
import com.smartaccounting.repository.PromotionRepository;
import com.smartaccounting.repository.PromotionResultRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PromotionService {
    private final PromotionRepository promotionRepository;
    private final PromotionProductRepository promotionProductRepository;
    private final PromotionResultRepository promotionResultRepository;

    public PromotionService(PromotionRepository promotionRepository,
                            PromotionProductRepository promotionProductRepository,
                            PromotionResultRepository promotionResultRepository) {
        this.promotionRepository = promotionRepository;
        this.promotionProductRepository = promotionProductRepository;
        this.promotionResultRepository = promotionResultRepository;
    }

    public List<ApplicablePromotion> getApplicablePromotions(String tenantId,
                                                             List<PromotionCartItem> cartItems,
                                                             BigDecimal cartTotal) {
        UUID tid = UUID.fromString(tenantId);
        Instant now = Instant.now();
        List<Promotion> activePromotions = promotionRepository
            .findByTenantIdAndStatusAndStartDateBeforeAndEndDateAfterAndDeletedAtIsNull(
                tid, "ACTIVE", now, now);

        List<ApplicablePromotion> applicable = new ArrayList<>();
        for (Promotion promo : activePromotions) {
            BigDecimal min = promo.getMinimumPurchase() != null ? promo.getMinimumPurchase() : BigDecimal.ZERO;
            if (cartTotal.compareTo(min) < 0) {
                continue;
            }
            if (promo.getUsageLimit() != null && promo.getUsageCount() != null
                && promo.getUsageCount() >= promo.getUsageLimit()) {
                continue;
            }
            BigDecimal discount = calculateDiscount(promo, cartItems, cartTotal);
            if (discount.compareTo(BigDecimal.ZERO) > 0) {
                if (promo.getMaximumDiscount() != null) {
                    discount = discount.min(promo.getMaximumDiscount());
                }
                applicable.add(new ApplicablePromotion(
                    promo.getId(), promo.getName(), promo.getPromotionType(), discount));
            }
        }
        return applicable.stream()
            .max(Comparator.comparing(ApplicablePromotion::discountAmount))
            .map(List::of)
            .orElse(List.of());
    }

    private BigDecimal calculateDiscount(Promotion promo, List<PromotionCartItem> cartItems, BigDecimal cartTotal) {
        return switch (promo.getPromotionType()) {
            case "PERCENTAGE_OFF" -> {
                BigDecimal eligible = getEligibleAmount(promo, cartItems, cartTotal);
                BigDecimal rate = promo.getDiscountValue() != null ? promo.getDiscountValue() : BigDecimal.ZERO;
                yield eligible.multiply(rate).setScale(2, RoundingMode.HALF_UP);
            }
            case "FIXED_AMOUNT_OFF" -> {
                BigDecimal eligible = getEligibleAmount(promo, cartItems, cartTotal);
                yield eligible.compareTo(BigDecimal.ZERO) > 0
                    ? promo.getDiscountValue() : BigDecimal.ZERO;
            }
            case "BUY_X_GET_Y" -> calculateBxgyDiscount(promo, cartItems);
            case "BUNDLE_PRICE" -> {
                BigDecimal eligible = getEligibleAmount(promo, cartItems, cartTotal);
                BigDecimal bundle = promo.getBundlePrice() != null ? promo.getBundlePrice() : BigDecimal.ZERO;
                yield eligible.subtract(bundle).max(BigDecimal.ZERO);
            }
            default -> BigDecimal.ZERO;
        };
    }

    private BigDecimal calculateBxgyDiscount(Promotion promo, List<PromotionCartItem> cartItems) {
        int buyX = promo.getBuyQuantity() != null ? promo.getBuyQuantity() : 1;
        int getY = promo.getGetQuantity() != null ? promo.getGetQuantity() : 0;
        if (getY <= 0) {
            return BigDecimal.ZERO;
        }
        Set<UUID> promoProducts = promotionProductRepository.findByPromotionId(promo.getId()).stream()
            .map(PromotionProduct::getProductId)
            .collect(Collectors.toSet());
        BigDecimal discount = BigDecimal.ZERO;
        for (PromotionCartItem item : cartItems) {
            if (!promoProducts.isEmpty() && !promoProducts.contains(item.productId())) {
                continue;
            }
            BigDecimal qty = item.quantity() != null ? item.quantity() : BigDecimal.ONE;
            int sets = qty.intValue() / (buyX + getY);
            if (sets > 0 && item.lineTotal().signum() > 0) {
                BigDecimal unitPrice = item.lineTotal().divide(qty, 4, RoundingMode.HALF_UP);
                discount = discount.add(unitPrice.multiply(new BigDecimal((long) sets * getY)));
            }
        }
        return discount.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal getEligibleAmount(Promotion promo, List<PromotionCartItem> cartItems, BigDecimal cartTotal) {
        return switch (promo.getAppliesTo() != null ? promo.getAppliesTo() : "ALL_PRODUCTS") {
            case "CATEGORY" -> cartItems.stream()
                .filter(i -> promo.getCategory() != null && promo.getCategory().equals(i.category()))
                .map(PromotionCartItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            case "SPECIFIC_PRODUCTS" -> {
                Set<UUID> promoProducts = promotionProductRepository.findByPromotionId(promo.getId()).stream()
                    .map(PromotionProduct::getProductId)
                    .collect(Collectors.toSet());
                yield cartItems.stream()
                    .filter(i -> promoProducts.contains(i.productId()))
                    .map(PromotionCartItem::lineTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
            default -> cartTotal;
        };
    }

    public void recordUsage(String tenantId, UUID promotionId, String posTransactionId,
                            BigDecimal discountApplied, BigDecimal originalAmount,
                            BigDecimal finalAmount, String currency) {
        PromotionResult result = new PromotionResult();
        result.setId(UUID.randomUUID());
        result.setTenantId(UUID.fromString(tenantId));
        result.setPromotionId(promotionId);
        result.setPosTransactionId(posTransactionId);
        result.setDiscountApplied(discountApplied);
        result.setOriginalAmount(originalAmount);
        result.setFinalAmount(finalAmount);
        result.setCurrencyCode(currency != null ? currency : "RWF");
        result.setAppliedAt(Instant.now());
        promotionResultRepository.save(result);
        promotionRepository.incrementUsageCount(promotionId);
    }

    public Promotion createPromotion(CreatePromotionRequest request, UUID createdBy) {
        UUID tid = requireTenant();
        Promotion promo = new Promotion();
        promo.setId(UUID.randomUUID());
        promo.setTenantId(tid);
        promo.setName(request.name());
        promo.setDescription(request.description());
        promo.setPromotionType(request.promotionType());
        promo.setDiscountValue(request.discountValue());
        promo.setBundlePrice(request.bundlePrice());
        promo.setBuyQuantity(request.buyQuantity());
        promo.setGetQuantity(request.getQuantity());
        promo.setAppliesTo(request.appliesTo() != null ? request.appliesTo() : "ALL_PRODUCTS");
        promo.setCategory(request.category());
        promo.setStatus("DRAFT");
        promo.setStartDate(request.startDate());
        promo.setEndDate(request.endDate());
        promo.setMinimumPurchase(request.minimumPurchase() != null ? request.minimumPurchase() : BigDecimal.ZERO);
        promo.setMaximumDiscount(request.maximumDiscount());
        promo.setUsageCount(0);
        promo.setUsageLimit(request.usageLimit());
        promo.setCreatedBy(createdBy);
        promo.setCreatedAt(Instant.now());
        promo = promotionRepository.save(promo);

        if (request.products() != null) {
            for (PromotionProductRequest pp : request.products()) {
                PromotionProduct row = new PromotionProduct();
                row.setId(UUID.randomUUID());
                row.setTenantId(tid);
                row.setPromotionId(promo.getId());
                row.setProductId(pp.productId());
                row.setSku(pp.sku());
                row.setProductName(pp.productName());
                row.setCreatedAt(Instant.now());
                promotionProductRepository.save(row);
            }
        }
        return promo;
    }

    @Transactional(readOnly = true)
    public Page<Promotion> listPromotions(String status, Pageable pageable) {
        UUID tid = requireTenant();
        if (status == null || status.isBlank()) {
            return promotionRepository.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(tid, pageable);
        }
        return promotionRepository.findByTenantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(tid, status, pageable);
    }

    public Promotion updateStatus(UUID promotionId, String status) {
        Promotion promo = promotionRepository.findByIdAndTenantIdAndDeletedAtIsNull(promotionId, requireTenant())
            .orElseThrow(() -> new IllegalArgumentException("Promotion not found"));
        promo.setStatus(status);
        return promotionRepository.save(promo);
    }

    @Transactional(readOnly = true)
    public List<Promotion> getActivePromotions() {
        return promotionRepository.findByTenantIdAndStatusAndDeletedAtIsNullOrderByStartDateDesc(
            requireTenant(), "ACTIVE");
    }

    @Transactional(readOnly = true)
    public PromotionPerformanceReport getPerformanceReport(String tenantId, UUID promotionId) {
        UUID tid = UUID.fromString(tenantId);
        Promotion promo = promotionRepository.findByIdAndTenantIdAndDeletedAtIsNull(promotionId, tid)
            .orElseThrow(() -> new IllegalArgumentException("Promotion not found"));
        List<PromotionResult> results = promotionResultRepository.findByTenantIdAndPromotionId(tid, promotionId);
        BigDecimal totalDiscount = results.stream()
            .map(PromotionResult::getDiscountApplied)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRevenue = results.stream()
            .map(PromotionResult::getFinalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avg = results.isEmpty()
            ? BigDecimal.ZERO
            : totalDiscount.divide(new BigDecimal(results.size()), 4, RoundingMode.HALF_UP);
        return new PromotionPerformanceReport(
            promotionId, promo.getName(), results.size(), totalDiscount, totalRevenue, avg);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
