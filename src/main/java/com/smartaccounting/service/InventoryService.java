package com.smartaccounting.service;

import com.smartaccounting.config.PosProperties;
import com.smartaccounting.dto.DomainEventRequest;
import com.smartaccounting.dto.LowStockItemDto;
import com.smartaccounting.dto.MoveStockRequest;
import com.smartaccounting.dto.NotificationEventRequest;
import com.smartaccounting.dto.ReceiveStockRequest;
import com.smartaccounting.entity.InventoryBatch;
import com.smartaccounting.entity.InventoryBalance;
import com.smartaccounting.entity.Product;
import com.smartaccounting.entity.StockMovement;
import com.smartaccounting.events.DomainEventPublisher;
import com.smartaccounting.repository.InventoryBatchRepository;
import com.smartaccounting.repository.InventoryBalanceRepository;
import com.smartaccounting.repository.PosCatalogItemRepository;
import com.smartaccounting.repository.ProductRepository;
import com.smartaccounting.repository.StockMovementRepository;
import com.smartaccounting.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InventoryService {
    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);

    private final EventLogService eventLogService;
    private final DomainEventPublisher eventPublisher;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PosProperties posProperties;
    private final PosCatalogItemRepository posCatalogItemRepository;
    private final ProductRepository productRepository;
    private final NotificationService notificationService;
    private final PushNotificationService pushNotificationService;

    public InventoryService(EventLogService eventLogService,
                            DomainEventPublisher eventPublisher,
                            InventoryBatchRepository inventoryBatchRepository,
                            InventoryBalanceRepository inventoryBalanceRepository,
                            StockMovementRepository stockMovementRepository,
                            PosProperties posProperties,
                            PosCatalogItemRepository posCatalogItemRepository,
                            ProductRepository productRepository,
                            NotificationService notificationService,
                            PushNotificationService pushNotificationService) {
        this.eventLogService = eventLogService;
        this.eventPublisher = eventPublisher;
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.posProperties = posProperties;
        this.posCatalogItemRepository = posCatalogItemRepository;
        this.productRepository = productRepository;
        this.notificationService = notificationService;
        this.pushNotificationService = pushNotificationService;
    }

    @Transactional
    public UUID moveStock(MoveStockRequest request) {
        UUID tenant = requireTenant();
        applyWithOptimisticRetry(tenant, request);
        UUID batchId = UUID.randomUUID();
        StockMovement movement = new StockMovement();
        movement.setId(UUID.randomUUID());
        movement.setTenantId(tenant);
        movement.setProductId(request.productId());
        movement.setFromLocationCode(request.fromLocation());
        movement.setToLocationCode(request.toLocation());
        movement.setQuantity(request.quantity());
        movement.setMovementType("MOVE");
        movement.setBatchId(batchId);
        movement.setCreatedAt(Instant.now());
        stockMovementRepository.save(movement);

        DomainEventRequest event = new DomainEventRequest(
            "INVENTORY",
            request.productId(),
            "INVENTORY_MOVED",
            Map.of(
                "tenantId", tenant.toString(),
                "productId", request.productId(),
                "from", request.fromLocation(),
                "to", request.toLocation(),
                "quantity", request.quantity(),
                "batchId", batchId.toString()
            )
        );
        UUID eventId = eventLogService.append(event);
        eventPublisher.publish("domain.inventory.events", "STOCK_MOVED", Map.of(
            "tenantId", tenant.toString(),
            "productId", request.productId().toString(),
            "from", request.fromLocation(),
            "to", request.toLocation(),
            "quantity", request.quantity(),
            "batchId", batchId.toString()
        ));
        return eventId;
    }

    @Transactional
    public UUID receiveStock(ReceiveStockRequest request) {
        UUID tenant = requireTenant();
        InventoryBalance to = inventoryBalanceRepository
            .findByTenantIdAndProductIdAndLocationCode(tenant, request.productId(), request.location())
            .orElseGet(() -> {
                InventoryBalance b = new InventoryBalance();
                b.setId(UUID.randomUUID());
                b.setTenantId(tenant);
                b.setProductId(request.productId());
                b.setLocationCode(request.location());
                b.setQuantity(java.math.BigDecimal.ZERO);
                b.setCreatedAt(Instant.now());
                b.setUpdatedAt(Instant.now());
                return b;
            });
        to.setQuantity(to.getQuantity().add(request.quantity()));
        to.setUpdatedAt(Instant.now());
        inventoryBalanceRepository.save(to);

        String lotCode = request.lotCode() != null && !request.lotCode().isBlank()
            ? request.lotCode().trim()
            : "AUTO-" + UUID.randomUUID().toString().substring(0, 8);
        InventoryBatch batch = inventoryBatchRepository
            .findByTenantIdAndProductIdAndLocationCodeAndLotCode(tenant, request.productId(), request.location(), lotCode)
            .orElseGet(() -> {
                InventoryBatch b = new InventoryBatch();
                b.setId(UUID.randomUUID());
                b.setTenantId(tenant);
                b.setProductId(request.productId());
                b.setLocationCode(request.location());
                b.setLotCode(lotCode);
                b.setExpiryDate(request.expiryDate());
                b.setQuantityOnHand(BigDecimal.ZERO);
                b.setCostPrice(request.costPrice().setScale(2, RoundingMode.HALF_UP));
                b.setCreatedAt(Instant.now());
                b.setUpdatedAt(Instant.now());
                return b;
            });
        if (batch.getExpiryDate() == null && request.expiryDate() != null) {
            batch.setExpiryDate(request.expiryDate());
        }
        if (batch.getCostPrice() == null) {
            batch.setCostPrice(request.costPrice().setScale(2, RoundingMode.HALF_UP));
        }
        batch.setQuantityOnHand(batch.getQuantityOnHand().add(request.quantity()));
        batch.setUpdatedAt(Instant.now());
        inventoryBatchRepository.save(batch);

        UUID batchId = UUID.randomUUID();
        StockMovement movement = new StockMovement();
        movement.setId(UUID.randomUUID());
        movement.setTenantId(tenant);
        movement.setProductId(request.productId());
        movement.setFromLocationCode("SUPPLIER");
        movement.setToLocationCode(request.location());
        movement.setQuantity(request.quantity());
        movement.setMovementType("RECEIVE");
        movement.setBatchId(batchId);
        movement.setCreatedAt(Instant.now());
        stockMovementRepository.save(movement);

        eventPublisher.publish("domain.inventory.events", "STOCK_RECEIVED", Map.of(
            "tenantId", tenant.toString(),
            "productId", request.productId().toString(),
            "quantity", request.quantity(),
            "movementType", "RECEIVE",
            "batchId", batchId.toString(),
            "location", request.location()
        ));
        return movement.getId();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listBalances(String locationCode) {
        UUID tenant = requireTenant();
        String loc = (locationCode != null && !locationCode.isBlank())
            ? locationCode.trim()
            : posProperties.getDefaultInventoryLocation();
        List<Map<String, Object>> out = new ArrayList<>();
        for (InventoryBalance b : inventoryBalanceRepository.findByTenantIdAndLocationCodeOrderByProductIdAsc(tenant, loc)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("productId", b.getProductId());
            row.put("locationCode", b.getLocationCode());
            row.put("quantity", b.getQuantity());
            productRepository.findByIdAndTenantId(b.getProductId(), tenant).ifPresent(p -> row.put("productName", p.getName()));
            out.add(row);
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listBatches(String locationCode) {
        UUID tenant = requireTenant();
        String loc = (locationCode != null && !locationCode.isBlank())
            ? locationCode.trim()
            : posProperties.getDefaultInventoryLocation();
        List<Map<String, Object>> out = new ArrayList<>();
        for (InventoryBatch b : inventoryBatchRepository.findByTenantIdAndLocationCodeOrderByProductIdAscExpiryDateAscCreatedAtAsc(tenant, loc)) {
            if (b.getQuantityOnHand() == null || b.getQuantityOnHand().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("batchId", b.getId());
            row.put("productId", b.getProductId());
            row.put("locationCode", b.getLocationCode());
            row.put("lotCode", b.getLotCode());
            row.put("expiryDate", b.getExpiryDate());
            row.put("quantityOnHand", b.getQuantityOnHand());
            productRepository.findByIdAndTenantId(b.getProductId(), tenant).ifPresent(p -> row.put("productName", p.getName()));
            out.add(row);
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> lowStock(String locationCode) {
        UUID tenant = requireTenant();
        String loc = (locationCode != null && !locationCode.isBlank())
            ? locationCode.trim()
            : posProperties.getDefaultInventoryLocation();
        Instant thirtyDaysAgo = Instant.now().minusSeconds(30L * 24 * 60 * 60);
        List<Map<String, Object>> out = new ArrayList<>();
        for (InventoryBalance b : inventoryBalanceRepository.findByTenantIdAndLocationCodeOrderByProductIdAsc(tenant, loc)) {
            Product p = productRepository.findByIdAndTenantId(b.getProductId(), tenant).orElse(null);
            if (p == null) {
                continue;
            }
            BigDecimal reorderPoint = posCatalogItemRepository.findByTenantIdAndProductIdAndActiveTrue(tenant, b.getProductId()).stream()
                .map(ci -> ci.getReorderPoint() == null ? BigDecimal.ZERO : ci.getReorderPoint())
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
            if (reorderPoint.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal onHand = b.getQuantity() == null ? BigDecimal.ZERO : b.getQuantity();
            if (onHand.compareTo(reorderPoint) > 0) {
                continue;
            }
            BigDecimal sales30 = stockMovementRepository.sumMovedQuantitySince(
                tenant,
                b.getProductId(),
                loc,
                posProperties.getSaleSinkLocation(),
                thirtyDaysAgo
            );
            BigDecimal dailyVelocity = sales30.compareTo(BigDecimal.ZERO) > 0
                ? sales30.divide(new BigDecimal("30"), 6, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
            BigDecimal daysRemaining = dailyVelocity.compareTo(BigDecimal.ZERO) > 0
                ? onHand.divide(dailyVelocity, 2, RoundingMode.HALF_UP)
                : null;
            Instant lastRestockedAt = stockMovementRepository.findLastRestockedAt(tenant, b.getProductId(), loc);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("productId", p.getId());
            row.put("sku", p.getSku());
            row.put("name", p.getName());
            row.put("currentOnHand", onHand);
            row.put("reorderPoint", reorderPoint);
            row.put("daysOfStockRemaining", daysRemaining);
            row.put("lastRestockedDate", lastRestockedAt);
            out.add(row);
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> expiryRisk(String locationCode, Integer daysAhead) {
        UUID tenant = requireTenant();
        String loc = (locationCode != null && !locationCode.isBlank())
            ? locationCode.trim()
            : posProperties.getDefaultInventoryLocation();
        int ahead = (daysAhead == null || daysAhead < 0) ? 30 : daysAhead;
        LocalDate cutoff = LocalDate.now().plusDays(ahead);
        List<Map<String, Object>> out = new ArrayList<>();
        for (InventoryBatch b : inventoryBatchRepository
            .findByTenantIdAndLocationCodeAndExpiryDateIsNotNullAndExpiryDateLessThanEqualOrderByExpiryDateAscCreatedAtAsc(tenant, loc, cutoff)) {
            if (b.getQuantityOnHand() == null || b.getQuantityOnHand().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            Product p = productRepository.findByIdAndTenantId(b.getProductId(), tenant).orElse(null);
            if (p == null) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("batchId", b.getId());
            row.put("productId", b.getProductId());
            row.put("sku", p.getSku());
            row.put("name", p.getName());
            row.put("locationCode", b.getLocationCode());
            row.put("lotCode", b.getLotCode());
            row.put("expiryDate", b.getExpiryDate());
            row.put("quantityOnHand", b.getQuantityOnHand());
            row.put("daysUntilExpiry", java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), b.getExpiryDate()));
            out.add(row);
        }
        return out;
    }

    /**
     * Deducts on-hand stock for a completed POS line: moves quantity from the default retail location to the sale sink.
     * Publishes {@code LOW_STOCK} when a reorder point is configured and on-hand falls to or below it.
     */
    @Transactional
    public List<BatchCostAllocation> deductForPosSale(UUID productId,
                                                      BigDecimal quantity,
                                                      UUID salesOrderId,
                                                      String barcodeLabel,
                                                      BigDecimal catalogReorderPoint) {
        return deductForPosSale(productId, quantity, salesOrderId, barcodeLabel, catalogReorderPoint, null);
    }

    public List<BatchCostAllocation> deductForPosSale(UUID productId,
                                                      BigDecimal quantity,
                                                      UUID salesOrderId,
                                                      String barcodeLabel,
                                                      BigDecimal catalogReorderPoint,
                                                      String preferredLotCode) {
        if (productId == null) {
            return List.of();
        }
        if (quantity == null || quantity.signum() <= 0) {
            return List.of();
        }
        UUID tenant = requireTenant();
        String from = posProperties.getDefaultInventoryLocation();
        String sink = posProperties.getSaleSinkLocation();
        BigDecimal onHand = inventoryBatchRepository
            .findByTenantIdAndProductIdAndLocationCodeOrderByExpiryDateAscCreatedAtAsc(tenant, productId, from).stream()
            .map(InventoryBatch::getQuantityOnHand)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (onHand.compareTo(BigDecimal.ZERO) <= 0) {
            onHand = inventoryBalanceRepository
                .findByTenantIdAndProductIdAndLocationCode(tenant, productId, from)
                .map(InventoryBalance::getQuantity)
                .orElse(BigDecimal.ZERO);
        }
        if (!posProperties.isAllowNegativeStock() && onHand.compareTo(quantity) < 0) {
            throw new IllegalArgumentException(
                "Insufficient stock for " + barcodeLabel + ": on hand " + onHand + ", sale qty " + quantity
            );
        }
        List<BatchCostAllocation> allocations = consumeBatchesFefoForPosSale(
            tenant, productId, from, sink, quantity, salesOrderId, barcodeLabel, preferredLotCode);
        if (catalogReorderPoint == null || catalogReorderPoint.compareTo(BigDecimal.ZERO) <= 0) {
            return allocations;
        }
        BigDecimal after = inventoryBalanceRepository
            .findByTenantIdAndProductIdAndLocationCode(tenant, productId, from)
            .map(InventoryBalance::getQuantity)
            .orElse(BigDecimal.ZERO);
        if (after.compareTo(catalogReorderPoint) <= 0) {
            eventPublisher.publish("domain.inventory.events", "LOW_STOCK", Map.of(
                "tenantId", tenant.toString(),
                "productId", productId.toString(),
                "barcode", barcodeLabel != null ? barcodeLabel : "",
                "locationCode", from,
                "quantityOnHand", after,
                "reorderPoint", catalogReorderPoint,
                "salesOrderId", salesOrderId.toString(),
                "timestamp", Instant.now().toString()
            ));
            try {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("productId", productId.toString());
                payload.put("quantityOnHand", after.toPlainString());
                payload.put("reorderPoint", catalogReorderPoint.toPlainString());
                notificationService.emit(new NotificationEventRequest("LOW_STOCK", payload));
            } catch (Exception ex) {
                log.warn("LOW_STOCK notification emit failed: {}", ex.getMessage());
            }
            String productName = productRepository.findById(productId)
                .map(Product::getName)
                .orElse(barcodeLabel != null ? barcodeLabel : "Product");
            pushNotificationService.sendToRole(
                tenant.toString(),
                "OPS_MANAGER",
                "Low Stock Alert",
                productName + " is below reorder point",
                Map.of(
                    "type", "LOW_STOCK",
                    "route", "/stock",
                    "productId", productId.toString()
                )
            );
        }
        return allocations;
    }

    private void applyWithOptimisticRetry(UUID tenant, MoveStockRequest request) {
        int retries = 3;
        while (retries-- > 0) {
            try {
                applyMovement(tenant, request);
                return;
            } catch (ObjectOptimisticLockingFailureException ex) {
                if (retries <= 0) {
                    throw ex;
                }
            }
        }
    }

    private List<BatchCostAllocation> consumeBatchesFefoForPosSale(UUID tenant,
                                                                    UUID productId,
                                                                    String from,
                                                                    String sink,
                                                                    BigDecimal quantity,
                                                                    UUID salesOrderId,
                                                                    String barcodeLabel) {
        return consumeBatchesFefoForPosSale(
            tenant, productId, from, sink, quantity, salesOrderId, barcodeLabel, null);
    }

    private List<BatchCostAllocation> consumeBatchesFefoForPosSale(UUID tenant,
                                                                    UUID productId,
                                                                    String from,
                                                                    String sink,
                                                                    BigDecimal quantity,
                                                                    UUID salesOrderId,
                                                                    String barcodeLabel,
                                                                    String preferredLotCode) {
        BigDecimal remaining = quantity;
        List<BatchCostAllocation> allocations = new ArrayList<>();
        if (preferredLotCode != null && !preferredLotCode.isBlank()) {
            remaining = consumePreferredLot(
                tenant, productId, from, sink, remaining, preferredLotCode.trim(), allocations);
        }
        List<InventoryBatch> batches = inventoryBatchRepository
            .findByTenantIdAndProductIdAndLocationCodeOrderByExpiryDateAscCreatedAtAsc(tenant, productId, from);
        for (InventoryBatch batch : batches) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            if (preferredLotCode != null
                && preferredLotCode.equalsIgnoreCase(batch.getLotCode())) {
                continue;
            }
            BigDecimal avail = batch.getQuantityOnHand() == null ? BigDecimal.ZERO : batch.getQuantityOnHand();
            if (avail.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal take = avail.min(remaining);
            batch.setQuantityOnHand(avail.subtract(take));
            batch.setUpdatedAt(Instant.now());
            inventoryBatchRepository.save(batch);
            BigDecimal costPrice = batch.getCostPrice() == null
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : batch.getCostPrice().setScale(2, RoundingMode.HALF_UP);
            allocations.add(new BatchCostAllocation(batch.getId(), take, costPrice));
            recordPosSaleMovement(tenant, productId, from, sink, take);
            remaining = remaining.subtract(take);
        }
        if (remaining.compareTo(BigDecimal.ZERO) > 0 && batches.isEmpty()) {
            allocations.add(new BatchCostAllocation(null, remaining, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)));
            recordPosSaleMovement(tenant, productId, from, sink, remaining);
            return allocations;
        }
        if (remaining.compareTo(BigDecimal.ZERO) > 0 && posProperties.isAllowNegativeStock()) {
            allocations.add(new BatchCostAllocation(null, remaining, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)));
            recordPosSaleMovement(tenant, productId, from, sink, remaining);
        } else if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalArgumentException("Insufficient FEFO batch stock for " + (barcodeLabel != null ? barcodeLabel : productId));
        }
        return allocations;
    }

    private BigDecimal consumePreferredLot(UUID tenant,
                                           UUID productId,
                                           String from,
                                           String sink,
                                           BigDecimal remaining,
                                           String lotCode,
                                           List<BatchCostAllocation> allocations) {
        return inventoryBatchRepository
            .findByTenantIdAndProductIdAndLocationCodeAndLotCode(tenant, productId, from, lotCode)
            .map(batch -> {
                BigDecimal avail = batch.getQuantityOnHand() == null
                    ? BigDecimal.ZERO : batch.getQuantityOnHand();
                if (avail.compareTo(BigDecimal.ZERO) <= 0) {
                    return remaining;
                }
                BigDecimal take = avail.min(remaining);
                batch.setQuantityOnHand(avail.subtract(take));
                batch.setUpdatedAt(Instant.now());
                inventoryBatchRepository.save(batch);
                BigDecimal costPrice = batch.getCostPrice() == null
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : batch.getCostPrice().setScale(2, RoundingMode.HALF_UP);
                allocations.add(new BatchCostAllocation(batch.getId(), take, costPrice));
                recordPosSaleMovement(tenant, productId, from, sink, take);
                return remaining.subtract(take);
            })
            .orElse(remaining);
    }

    private void recordPosSaleMovement(UUID tenant,
                                       UUID productId,
                                       String from,
                                       String sink,
                                       BigDecimal quantity) {
        applyMovement(tenant, new MoveStockRequest(productId, from, sink, quantity, "POS_SALE"));
        StockMovement movement = new StockMovement();
        movement.setId(UUID.randomUUID());
        movement.setTenantId(tenant);
        movement.setProductId(productId);
        movement.setFromLocationCode(from);
        movement.setToLocationCode(sink);
        movement.setQuantity(quantity);
        movement.setMovementType("MOVE");
        movement.setBatchId(UUID.randomUUID());
        movement.setCreatedAt(Instant.now());
        stockMovementRepository.save(movement);
    }

    private void applyMovement(UUID tenant, MoveStockRequest request) {
        InventoryBalance from = inventoryBalanceRepository
            .findByTenantIdAndProductIdAndLocationCode(tenant, request.productId(), request.fromLocation())
            .orElseGet(() -> {
                InventoryBalance b = new InventoryBalance();
                b.setId(UUID.randomUUID());
                b.setTenantId(tenant);
                b.setProductId(request.productId());
                b.setLocationCode(request.fromLocation());
                b.setQuantity(java.math.BigDecimal.ZERO);
                b.setCreatedAt(Instant.now());
                b.setUpdatedAt(Instant.now());
                return b;
            });
        InventoryBalance to = inventoryBalanceRepository
            .findByTenantIdAndProductIdAndLocationCode(tenant, request.productId(), request.toLocation())
            .orElseGet(() -> {
                InventoryBalance b = new InventoryBalance();
                b.setId(UUID.randomUUID());
                b.setTenantId(tenant);
                b.setProductId(request.productId());
                b.setLocationCode(request.toLocation());
                b.setQuantity(java.math.BigDecimal.ZERO);
                b.setCreatedAt(Instant.now());
                b.setUpdatedAt(Instant.now());
                return b;
            });
        from.setQuantity(from.getQuantity().subtract(request.quantity()));
        to.setQuantity(to.getQuantity().add(request.quantity()));
        from.setUpdatedAt(Instant.now());
        to.setUpdatedAt(Instant.now());
        inventoryBalanceRepository.save(from);
        inventoryBalanceRepository.save(to);
    }

    @Transactional(readOnly = true)
    public BigDecimal resolveLatestUnitCost(UUID productId, String locationCode) {
        if (productId == null) {
            return BigDecimal.ZERO;
        }
        UUID tenant = requireTenant();
        String loc = locationCode != null && !locationCode.isBlank() ? locationCode.trim() : "SHOP";
        return inventoryBatchRepository
            .findByTenantIdAndProductIdAndLocationCodeOrderByExpiryDateAscCreatedAtAsc(tenant, productId, loc)
            .stream()
            .map(com.smartaccounting.entity.InventoryBatch::getCostPrice)
            .filter(price -> price != null && price.signum() > 0)
            .findFirst()
            .orElse(BigDecimal.ZERO);
    }

    /**
     * Writes off stock from the default retail location to the sale sink (shrinkage, damage, expiry).
     */
    @Transactional
    public void writeOffStock(UUID productId, BigDecimal quantity, String reason) {
        if (productId == null || quantity == null || quantity.signum() <= 0) {
            throw new IllegalArgumentException("Product and positive quantity required for write-off");
        }
        UUID tenant = requireTenant();
        deductForPosSale(productId, quantity, UUID.randomUUID(), "write-off:" + reason, null);
        log.info("Stock write-off tenant={} product={} qty={} reason={}", tenant, productId, quantity, reason);
    }

    @Transactional(readOnly = true)
    public long getLowStockCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        try {
            return inventoryBalanceRepository.findByTenantIdAndLocationCodeOrderByProductIdAsc(tenantId, "SHOP").stream()
                .filter(b -> b.getQuantity() != null && b.getQuantity().compareTo(new BigDecimal("10")) <= 0)
                .count();
        } catch (Exception ex) {
            log.debug("getLowStockCount failed for {}: {}", tenantId, ex.getMessage());
            return 0L;
        }
    }

    @Transactional(readOnly = true)
    public List<LowStockItemDto> getLowStockItems(String tenantId) {
        UUID tid = UUID.fromString(tenantId);
        UUID priorTenant = TenantContext.tenantId();
        UUID priorUser = TenantContext.userId();
        try {
            TenantContext.set(tid, priorUser);
            List<LowStockItemDto> items = new ArrayList<>();
            for (Map<String, Object> row : lowStock("SHOP")) {
                UUID productId = (UUID) row.get("productId");
                String productName = String.valueOf(row.get("name"));
                BigDecimal daysBd = row.get("daysOfStockRemaining") instanceof BigDecimal bd ? bd : null;
                int days = daysBd == null ? 0 : daysBd.intValue();
                BigDecimal reorderPoint = row.get("reorderPoint") instanceof BigDecimal rp ? rp : BigDecimal.TEN;
                BigDecimal onHand = row.get("currentOnHand") instanceof BigDecimal oh ? oh : BigDecimal.ZERO;
                BigDecimal suggested = onHand.max(reorderPoint.multiply(new BigDecimal("3")));
                items.add(new LowStockItemDto(productId, productName, days, suggested));
            }
            return items;
        } finally {
            if (priorTenant != null) {
                TenantContext.set(priorTenant, priorUser);
            } else {
                TenantContext.clear();
            }
        }
    }

    @Transactional(readOnly = true)
    public BigDecimal getReorderQuantity(UUID tenantId, UUID productId) {
        return posCatalogItemRepository.findByTenantIdAndProductIdAndActiveTrue(tenantId, productId).stream()
            .map(c -> c.getReorderPoint() != null ? c.getReorderPoint() : BigDecimal.TEN)
            .findFirst()
            .orElse(new BigDecimal("10"));
    }

    @Transactional(readOnly = true)
    public BigDecimal getLastCostPrice(UUID tenantId, UUID productId) {
        return inventoryBatchRepository
            .findByTenantIdAndProductIdAndLocationCodeOrderByExpiryDateAscCreatedAtAsc(tenantId, productId, "SHOP")
            .stream()
            .map(InventoryBatch::getCostPrice)
            .filter(c -> c != null && c.signum() > 0)
            .reduce((a, b) -> b)
            .orElse(BigDecimal.ONE);
    }

    @Transactional(readOnly = true)
    public long getExpiringCount(UUID tenantId, int daysWithin) {
        if (tenantId == null || daysWithin <= 0) {
            return 0L;
        }
        try {
            LocalDate from = LocalDate.now();
            LocalDate to = from.plusDays(daysWithin);
            return inventoryBatchRepository.countExpiringBetween(tenantId, "SHOP", from, to);
        } catch (Exception ex) {
            log.debug("getExpiringCount failed for {}: {}", tenantId, ex.getMessage());
            return 0L;
        }
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }

    public record BatchCostAllocation(UUID inventoryBatchId, BigDecimal quantity, BigDecimal costPrice) {
    }
}
