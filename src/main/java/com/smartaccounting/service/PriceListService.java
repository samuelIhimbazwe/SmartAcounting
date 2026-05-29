package com.smartaccounting.service;

import com.smartaccounting.dto.PriceListLineRequest;
import com.smartaccounting.dto.UpsertPriceListRequest;
import com.smartaccounting.entity.FinanceCustomer;
import com.smartaccounting.entity.PosCatalogItem;
import com.smartaccounting.entity.PriceList;
import com.smartaccounting.entity.PriceListLine;
import com.smartaccounting.repository.FinanceCustomerRepository;
import com.smartaccounting.repository.PosCatalogItemRepository;
import com.smartaccounting.repository.PriceListLineRepository;
import com.smartaccounting.repository.PriceListRepository;
import com.smartaccounting.repository.ProductRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class PriceListService {
    private static final Set<String> LIST_TYPES = Set.of("STANDARD", "WHOLESALE", "VIP", "PROMOTIONAL");

    private final PriceListRepository priceListRepository;
    private final PriceListLineRepository lineRepository;
    private final FinanceCustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final PosCatalogItemRepository catalogRepository;

    public PriceListService(PriceListRepository priceListRepository,
                            PriceListLineRepository lineRepository,
                            FinanceCustomerRepository customerRepository,
                            ProductRepository productRepository,
                            PosCatalogItemRepository catalogRepository) {
        this.priceListRepository = priceListRepository;
        this.lineRepository = lineRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.catalogRepository = catalogRepository;
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
        if (Boolean.FALSE.equals(list.getActive())) {
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

    /** Branch list → customer list → global list → fallback base price. */
    public BigDecimal resolveCheckoutUnitPrice(
        UUID locationId,
        UUID customerPriceListId,
        UUID productId,
        UUID variantId,
        BigDecimal fallback
    ) {
        UUID tenant = requireTenant();
        BigDecimal resolved = fallback;
        if (locationId != null) {
            final BigDecimal beforeBranch = resolved;
            resolved = priceListRepository
                .findFirstByTenantIdAndLocationIdAndDeletedAtIsNull(tenant, locationId)
                .map(list -> resolveUnitPrice(list.getId(), productId, variantId, beforeBranch))
                .orElse(beforeBranch);
        }
        if (customerPriceListId != null) {
            resolved = resolveUnitPrice(customerPriceListId, productId, variantId, resolved);
        }
        final BigDecimal beforeGlobal = resolved;
        resolved = priceListRepository
            .findFirstByTenantIdAndLocationIdIsNullAndScopeAndDeletedAtIsNull(tenant, "GLOBAL")
            .map(list -> resolveUnitPrice(list.getId(), productId, variantId, beforeGlobal))
            .orElse(beforeGlobal);
        return resolved;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPriceLists() {
        UUID tenant = requireTenant();
        return priceListRepository.findByTenantIdAndDeletedAtIsNullOrderByName(tenant).stream()
            .map(this::toListRowMap)
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPriceList(UUID id) {
        PriceList list = findOrThrow(id);
        return toDetailMap(list);
    }

    public Map<String, Object> create(UpsertPriceListRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new IllegalArgumentException("Price list name is required");
        }
        UUID tenant = requireTenant();
        Instant now = Instant.now();
        PriceList list = new PriceList();
        list.setId(UUID.randomUUID());
        list.setTenantId(tenant);
        list.setScope("GLOBAL");
        list.setCreatedAt(now);
        list.setUpdatedAt(now);
        applyRequest(list, req, true);
        list.setValidFrom(req.validFrom());
        list.setValidTo(req.validTo());
        priceListRepository.save(list);
        if (req.lines() != null) {
            replaceLines(list.getId(), tenant, req.lines());
        }
        return toDetailMap(list);
    }

    public Map<String, Object> update(UUID id, UpsertPriceListRequest req) {
        PriceList list = findOrThrow(id);
        applyRequest(list, req, false);
        if (req.lines() == null) {
            list.setValidFrom(req.validFrom());
            list.setValidTo(req.validTo());
        }
        list.setUpdatedAt(Instant.now());
        priceListRepository.save(list);
        if (req.lines() != null) {
            replaceLines(list.getId(), list.getTenantId(), req.lines());
        }
        return toDetailMap(list);
    }

    public Map<String, Object> assignCustomer(UUID priceListId, UUID customerId) {
        UUID tenant = requireTenant();
        findOrThrow(priceListId);
        FinanceCustomer customer = customerRepository.findByIdAndTenantId(customerId, tenant)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        if (customer.getDeletedAt() != null) {
            throw new IllegalArgumentException("Customer not found");
        }
        customer.setPriceListId(priceListId);
        customerRepository.save(customer);
        return Map.of("customerId", customerId, "priceListId", priceListId);
    }

    public Map<String, Object> unassignCustomer(UUID priceListId, UUID customerId) {
        UUID tenant = requireTenant();
        findOrThrow(priceListId);
        FinanceCustomer customer = customerRepository.findByIdAndTenantId(customerId, tenant)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        if (customer.getDeletedAt() != null) {
            throw new IllegalArgumentException("Customer not found");
        }
        if (customer.getPriceListId() == null || !customer.getPriceListId().equals(priceListId)) {
            throw new IllegalArgumentException("Customer is not assigned to this price list");
        }
        customer.setPriceListId(null);
        customerRepository.save(customer);
        return Map.of("customerId", customerId, "priceListId", priceListId);
    }

    public Map<String, Object> toMap(PriceList p) {
        return toListRowMap(p);
    }

    private Map<String, Object> toListRowMap(PriceList p) {
        UUID tenant = p.getTenantId();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("listType", normalizeListType(p.getListType()));
        m.put("currencyCode", p.getCurrencyCode());
        m.put("discountPct", p.getDiscountPct());
        m.put("validFrom", p.getValidFrom());
        m.put("validTo", p.getValidTo());
        m.put("minOrderQty", p.getMinOrderQty() != null ? p.getMinOrderQty() : 1);
        m.put("active", p.getActive() == null || p.getActive());
        m.put("status", computeStatus(p));
        m.put("customersAssigned", customerRepository.countByTenantIdAndPriceListIdAndDeletedAtIsNull(tenant, p.getId()));
        m.put("products", lineRepository.countByPriceListId(p.getId()));
        m.put("locationId", p.getLocationId());
        m.put("scope", p.getScope());
        return m;
    }

    private Map<String, Object> toDetailMap(PriceList p) {
        UUID tenant = p.getTenantId();
        Map<String, Object> m = toListRowMap(p);
        List<Map<String, Object>> lines = lineRepository.findByPriceListId(p.getId()).stream()
            .map(line -> lineDetailMap(tenant, p, line))
            .toList();
        m.put("lines", lines);
        List<Map<String, Object>> customers = customerRepository
            .findByTenantIdAndPriceListIdAndDeletedAtIsNullOrderByCustomerNameAsc(tenant, p.getId())
            .stream()
            .map(this::customerMap)
            .toList();
        m.put("customers", customers);
        return m;
    }

    private Map<String, Object> lineDetailMap(UUID tenant, PriceList list, PriceListLine line) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", line.getId());
        m.put("productId", line.getProductId());
        m.put("variantId", line.getVariantId());
        m.put("unitPrice", line.getUnitPrice());
        productRepository.findByIdAndTenantId(line.getProductId(), tenant).ifPresent(product -> {
            m.put("productName", product.getName());
            m.put("sku", product.getSku());
        });
        BigDecimal standard = resolveStandardPrice(tenant, line.getProductId());
        m.put("standardPrice", standard);
        m.put("differencePct", priceDifferencePct(standard, effectiveLinePrice(list, line.getUnitPrice())));
        return m;
    }

    private BigDecimal effectiveLinePrice(PriceList list, BigDecimal unitPrice) {
        if (list.getDiscountPct() == null || list.getDiscountPct().signum() <= 0) {
            return unitPrice;
        }
        BigDecimal factor = BigDecimal.ONE.subtract(
            list.getDiscountPct().divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP));
        return unitPrice.multiply(factor).setScale(2, RoundingMode.HALF_UP);
    }

    private Map<String, Object> customerMap(FinanceCustomer c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("name", c.getCustomerName());
        m.put("phone", c.getPhone());
        m.put("email", c.getEmail());
        return m;
    }

    private void applyRequest(PriceList list, UpsertPriceListRequest req, boolean creating) {
        if (req.name() != null && !req.name().isBlank()) {
            list.setName(req.name().trim());
        } else if (creating) {
            throw new IllegalArgumentException("Price list name is required");
        }
        if (req.listType() != null) {
            list.setListType(normalizeListType(req.listType()));
        } else if (creating && list.getListType() == null) {
            list.setListType("STANDARD");
        }
        if (req.currencyCode() != null && !req.currencyCode().isBlank()) {
            list.setCurrencyCode(req.currencyCode().trim().toUpperCase(Locale.ROOT));
        } else if (creating && list.getCurrencyCode() == null) {
            list.setCurrencyCode("RWF");
        }
        if (req.discountPct() != null) {
            list.setDiscountPct(req.discountPct());
        }
        if (req.minOrderQty() != null) {
            if (req.minOrderQty() < 1) {
                throw new IllegalArgumentException("Minimum order quantity must be at least 1");
            }
            list.setMinOrderQty(req.minOrderQty());
        } else if (creating && list.getMinOrderQty() == null) {
            list.setMinOrderQty(1);
        }
        if (req.active() != null) {
            list.setActive(req.active());
        } else if (creating && list.getActive() == null) {
            list.setActive(true);
        }
    }

    private void replaceLines(UUID priceListId, UUID tenant, List<PriceListLineRequest> lines) {
        List<PriceListLine> existing = lineRepository.findByPriceListId(priceListId);
        lineRepository.deleteAll(existing);
        Instant now = Instant.now();
        for (PriceListLineRequest req : lines) {
            if (req.productId() == null || req.unitPrice() == null) {
                continue;
            }
            productRepository.findByIdAndTenantId(req.productId(), tenant)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + req.productId()));
            PriceListLine line = new PriceListLine();
            line.setId(UUID.randomUUID());
            line.setTenantId(tenant);
            line.setPriceListId(priceListId);
            line.setProductId(req.productId());
            line.setVariantId(req.variantId());
            line.setUnitPrice(req.unitPrice().setScale(4, RoundingMode.HALF_UP));
            line.setCreatedAt(now);
            lineRepository.save(line);
        }
    }

    private PriceList findOrThrow(UUID id) {
        return priceListRepository.findByIdAndTenantIdAndDeletedAtIsNull(id, requireTenant())
            .orElseThrow(() -> new IllegalArgumentException("Price list not found"));
    }

    private String normalizeListType(String raw) {
        if (raw == null || raw.isBlank()) {
            return "STANDARD";
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
        if ("VIP_CUSTOMER".equals(normalized)) {
            normalized = "VIP";
        }
        if (!LIST_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported price list type: " + raw);
        }
        return normalized;
    }

    private String computeStatus(PriceList p) {
        if (Boolean.FALSE.equals(p.getActive())) {
            return "INACTIVE";
        }
        Instant now = Instant.now();
        if (p.getValidFrom() != null && now.isBefore(p.getValidFrom())) {
            return "SCHEDULED";
        }
        if (p.getValidTo() != null && now.isAfter(p.getValidTo())) {
            return "EXPIRED";
        }
        return "ACTIVE";
    }

    private BigDecimal resolveStandardPrice(UUID tenant, UUID productId) {
        return catalogRepository.findFirstByTenantIdAndProductIdAndActiveTrueOrderByCreatedAtDesc(tenant, productId)
            .map(PosCatalogItem::getUnitPrice)
            .orElse(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
    }

    private BigDecimal priceDifferencePct(BigDecimal standard, BigDecimal listPrice) {
        if (standard == null || standard.signum() <= 0) {
            return null;
        }
        BigDecimal diff = listPrice.subtract(standard)
            .divide(standard, 4, RoundingMode.HALF_UP)
            .multiply(new BigDecimal("100"))
            .setScale(1, RoundingMode.HALF_UP);
        return diff;
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context required");
        }
        return TenantContext.tenantId();
    }
}
