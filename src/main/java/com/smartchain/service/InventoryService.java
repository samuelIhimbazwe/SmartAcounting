package com.smartchain.service;

import com.smartchain.dto.DomainEventRequest;
import com.smartchain.dto.MoveStockRequest;
import com.smartchain.dto.ReceiveStockRequest;
import com.smartchain.entity.InventoryBalance;
import com.smartchain.entity.StockMovement;
import com.smartchain.events.DomainEventPublisher;
import com.smartchain.repository.InventoryBalanceRepository;
import com.smartchain.repository.StockMovementRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class InventoryService {
    private final EventLogService eventLogService;
    private final DomainEventPublisher eventPublisher;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final StockMovementRepository stockMovementRepository;

    public InventoryService(EventLogService eventLogService,
                            DomainEventPublisher eventPublisher,
                            InventoryBalanceRepository inventoryBalanceRepository,
                            StockMovementRepository stockMovementRepository) {
        this.eventLogService = eventLogService;
        this.eventPublisher = eventPublisher;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.stockMovementRepository = stockMovementRepository;
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
                "fromLocationId", request.fromLocation(),
                "toLocationId", request.toLocation(),
                "quantity", request.quantity(),
                "movementType", "MOVE",
                "batchId", batchId.toString(),
                "reason", request.reason(),
                "occurredAt", Instant.now().toString()
            )
        );
        UUID eventId = eventLogService.append(event);
        eventPublisher.publish("domain.inventory.events", "STOCK_MOVED", Map.of(
            "tenantId", tenant.toString(),
            "productId", request.productId().toString(),
            "fromLocationId", request.fromLocation(),
            "toLocationId", request.toLocation(),
            "quantity", request.quantity(),
            "movementType", "MOVE",
            "batchId", batchId.toString(),
            "timestamp", Instant.now().toString()
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
            "toLocationId", request.location(),
            "quantity", request.quantity(),
            "movementType", "RECEIVE",
            "batchId", batchId.toString(),
            "supplierRef", request.supplierRef(),
            "timestamp", Instant.now().toString()
        ));
        return movement.getId();
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

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
