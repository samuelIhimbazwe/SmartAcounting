package com.smartaccounting.service;

import com.smartaccounting.compliance.rwanda.RwandaVatMath;
import com.smartaccounting.entity.Location;
import com.smartaccounting.entity.Product;
import com.smartaccounting.entity.TaxConfig;
import com.smartaccounting.repository.LocationRepository;
import com.smartaccounting.repository.ProductRepository;
import com.smartaccounting.repository.TaxConfigRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TaxConfigService {
    private final TaxConfigRepository taxConfigRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;

    public TaxConfigService(TaxConfigRepository taxConfigRepository,
                            ProductRepository productRepository,
                            LocationRepository locationRepository) {
        this.taxConfigRepository = taxConfigRepository;
        this.productRepository = productRepository;
        this.locationRepository = locationRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listActive() {
        UUID tenant = requireTenant();
        return taxConfigRepository.findByTenantIdAndActiveTrueOrderByNameAsc(tenant).stream()
            .map(this::toMap)
            .toList();
    }

    @Transactional(readOnly = true)
    public TaxConfig resolveForProduct(UUID productId, UUID locationId) {
        UUID tenant = requireTenant();
        TaxConfig fallback = defaultForLocation(tenant, locationId);
        if (productId == null) {
            return fallback;
        }
        Product product = productRepository.findByIdAndTenantId(productId, tenant).orElse(null);
        if (product == null || product.getTaxConfigId() == null) {
            return fallback;
        }
        return taxConfigRepository.findByIdAndTenantId(product.getTaxConfigId(), tenant)
            .filter(TaxConfig::isActive)
            .orElse(fallback);
    }

    public LineVatSplit calculateLineVat(BigDecimal lineGross, TaxConfig config, boolean taxExempt) {
        if (taxExempt) {
            BigDecimal g = scale(lineGross);
            return new LineVatSplit(g, BigDecimal.ZERO, g);
        }
        boolean inclusive = config == null || "INCLUSIVE".equalsIgnoreCase(config.getType());
        BigDecimal ratePercent = config == null
            ? new BigDecimal("18")
            : config.getRate().multiply(BigDecimal.valueOf(100));
        Map<String, BigDecimal> split = RwandaVatMath.splitLineAmount(lineGross, inclusive, ratePercent);
        return new LineVatSplit(
            scale(split.get("net")),
            scale(split.get("vat")),
            scale(split.get("gross"))
        );
    }

    private TaxConfig defaultForLocation(UUID tenant, UUID locationId) {
        if (locationId != null) {
            Location loc = locationRepository.findByIdAndTenantId(locationId, tenant).orElse(null);
            if (loc != null && loc.getTaxConfigId() != null) {
                return taxConfigRepository.findByIdAndTenantId(loc.getTaxConfigId(), tenant)
                    .filter(TaxConfig::isActive)
                    .orElseGet(() -> firstActive(tenant));
            }
        }
        return firstActive(tenant);
    }

    private TaxConfig firstActive(UUID tenant) {
        return taxConfigRepository.findByTenantIdAndActiveTrueOrderByNameAsc(tenant).stream()
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No active tax config for tenant"));
    }

    private Map<String, Object> toMap(TaxConfig c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("name", c.getName());
        m.put("rate", c.getRate());
        m.put("type", c.getType());
        m.put("appliesTo", c.getAppliesTo());
        m.put("categoryCode", c.getCategoryCode());
        m.put("active", c.isActive());
        return m;
    }

    private static BigDecimal scale(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }

    public record LineVatSplit(BigDecimal net, BigDecimal vat, BigDecimal gross) {}
}
