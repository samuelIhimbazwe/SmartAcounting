package com.smartaccounting.service;

import com.smartaccounting.entity.PriceList;
import com.smartaccounting.entity.PriceListLine;
import com.smartaccounting.repository.PriceListLineRepository;
import com.smartaccounting.repository.PriceListRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class PriceListService {
    private final PriceListRepository priceListRepository;
    private final PriceListLineRepository lineRepository;

    public PriceListService(PriceListRepository priceListRepository,
                            PriceListLineRepository lineRepository) {
        this.priceListRepository = priceListRepository;
        this.lineRepository = lineRepository;
    }

    public BigDecimal resolveUnitPrice(UUID priceListId,
                                       UUID productId,
                                       UUID variantId,
                                       BigDecimal fallback) {
        if (priceListId == null) {
            return fallback;
        }
        PriceList list = priceListRepository.findByIdAndTenantIdAndDeletedAtIsNull(
            priceListId, requireTenant()).orElse(null);
        if (list == null) {
            return fallback;
        }
        Instant now = Instant.now();
        if (list.getValidFrom() != null && now.isBefore(list.getValidFrom())) {
            return fallback;
        }
        if (list.getValidTo() != null && now.isAfter(list.getValidTo())) {
            return fallback;
        }
        PriceListLine line = null;
        if (variantId != null) {
            line = lineRepository.findFirstByPriceListIdAndProductIdAndVariantId(
                priceListId, productId, variantId).orElse(null);
        }
        if (line == null) {
            line = lineRepository.findFirstByPriceListIdAndProductIdAndVariantIdIsNull(
                priceListId, productId).orElse(null);
        }
        BigDecimal base = line != null ? line.getUnitPrice() : fallback;
        if (list.getDiscountPct() != null && list.getDiscountPct().signum() > 0) {
            BigDecimal factor = BigDecimal.ONE.subtract(
                list.getDiscountPct().divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP));
            base = base.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        }
        return base;
    }

    public List<Map<String, Object>> listPriceLists() {
        UUID tenant = requireTenant();
        return priceListRepository.findByTenantIdAndDeletedAtIsNullOrderByName(tenant).stream()
            .map(this::toMap)
            .toList();
    }

    public Map<String, Object> toMap(PriceList p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("currencyCode", p.getCurrencyCode());
        m.put("discountPct", p.getDiscountPct());
        m.put("validFrom", p.getValidFrom());
        m.put("validTo", p.getValidTo());
        return m;
    }

    private UUID requireTenant() {
        return UUID.fromString(TenantContext.getTenantId());
    }
}
