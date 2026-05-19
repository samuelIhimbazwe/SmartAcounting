package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.MobileMoneyCallbackRequest;
import com.smartaccounting.dto.PosCheckoutLineRequest;
import com.smartaccounting.dto.PosCheckoutRequest;
import com.smartaccounting.dto.PosTenderRequest;
import com.smartaccounting.dto.SyncOperationRequest;
import com.smartaccounting.entity.InventoryBalance;
import com.smartaccounting.entity.PosCatalogItem;
import com.smartaccounting.entity.SyncQueueItem;
import com.smartaccounting.repository.InventoryBalanceRepository;
import com.smartaccounting.repository.PosCatalogItemRepository;
import com.smartaccounting.repository.SyncQueueRepository;
import com.smartaccounting.config.PosProperties;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class SyncService {
    private final SyncQueueRepository repository;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;
    private final PosCheckoutService posCheckoutService;
    private final MobileMoneyReconciliationService mobileMoneyReconciliationService;
    private final PosCatalogItemRepository posCatalogItemRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final CurrencyService currencyService;
    private final PosProperties posProperties;

    public SyncService(SyncQueueRepository repository,
                       ObjectMapper objectMapper,
                       AuditService auditService,
                       PosCheckoutService posCheckoutService,
                       MobileMoneyReconciliationService mobileMoneyReconciliationService,
                       PosCatalogItemRepository posCatalogItemRepository,
                       InventoryBalanceRepository inventoryBalanceRepository,
                       CurrencyService currencyService,
                       PosProperties posProperties) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
        this.posCheckoutService = posCheckoutService;
        this.mobileMoneyReconciliationService = mobileMoneyReconciliationService;
        this.posCatalogItemRepository = posCatalogItemRepository;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.currencyService = currencyService;
        this.posProperties = posProperties;
    }

    @Transactional
    public UUID enqueue(SyncOperationRequest request) {
        UUID tenantId = requireTenant();
        if (repository.existsByTenantIdAndDeviceIdAndIdempotencyKey(tenantId, request.deviceId(), request.idempotencyKey())) {
            return UUID.fromString("00000000-0000-0000-0000-000000000000");
        }
        SyncQueueItem item = new SyncQueueItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(tenantId);
        item.setDeviceId(request.deviceId());
        item.setIdempotencyKey(request.idempotencyKey());
        item.setOperationType(request.operationType());
        item.setEntityType(request.entityType());
        try {
            item.setPayload(objectMapper.writeValueAsString(request.payload()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid sync payload");
        }
        item.setLamportClock(request.lamportClock());
        item.setStatus("PENDING");
        item.setConflictPolicy(request.conflictPolicy() == null || request.conflictPolicy().isBlank()
            ? "LAST_WRITE_WINS" : request.conflictPolicy());
        repository.save(item);
        auditService.logAction("SYNC_ENQUEUED", "SYNC_QUEUE", "{}", "{\"id\":\"" + item.getId() + "\"}");
        return item.getId();
    }

    @Transactional
    public Map<String, Object> enqueueBatch(List<SyncOperationRequest> requests) {
        UUID tenantId = requireTenant();
        int queued = 0;
        int duplicates = 0;
        List<UUID> syncIds = new ArrayList<>();
        for (SyncOperationRequest req : requests) {
            if (repository.existsByTenantIdAndDeviceIdAndIdempotencyKey(tenantId, req.deviceId(), req.idempotencyKey())) {
                duplicates++;
                continue;
            }
            syncIds.add(enqueue(req));
            queued++;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("queued", queued);
        out.put("duplicates", duplicates);
        out.put("syncIds", syncIds);
        return out;
    }

    @Transactional
    public int flushPending() {
        UUID tenant = requireTenant();
        List<SyncQueueItem> pending = repository.findTop200ByTenantIdAndStatusOrderByLamportClockAsc(tenant, "PENDING");
        int processed = 0;
        for (SyncQueueItem item : pending) {
            try {
                processOne(item);
                processed++;
            } catch (Exception ex) {
                item.setStatus("FAILED");
                item.setErrorMessage(ex.getMessage());
                item.setSyncedAt(Instant.now());
            }
        }
        repository.saveAll(pending);
        return processed;
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }

    @SuppressWarnings("unchecked")
    private void processOne(SyncQueueItem item) throws Exception {
        String op = item.getOperationType() == null ? "" : item.getOperationType().trim().toUpperCase(Locale.ROOT);
        if (!"POS_SALE".equals(op)) {
            item.setStatus("SYNCED");
            item.setSyncedAt(Instant.now());
            return;
        }
        Map<String, Object> raw = objectMapper.readValue(item.getPayload(), Map.class);
        PosCheckoutRequest req = objectMapper.convertValue(raw, PosCheckoutRequest.class);
        String currency = req.currencyCode().toUpperCase(Locale.ROOT);

        List<PosCheckoutLineRequest> accepted = new ArrayList<>();
        List<Map<String, Object>> conflicts = new ArrayList<>();
        Map<UUID, BigDecimal> availableByProduct = new LinkedHashMap<>();
        for (PosCheckoutLineRequest line : req.lines()) {
            String barcode = line.barcode().trim();
            PosCatalogItem cat = posCatalogItemRepository
                .findByTenantIdAndBarcodeAndActiveTrue(item.getTenantId(), barcode)
                .orElseThrow(() -> new IllegalArgumentException("Unknown barcode: " + barcode));
            if (cat.getProductId() == null) {
                accepted.add(line);
                continue;
            }
            BigDecimal avail = availableByProduct.computeIfAbsent(cat.getProductId(), pid ->
                inventoryBalanceRepository.findByTenantIdAndProductIdAndLocationCode(
                    item.getTenantId(), pid, posProperties.getDefaultInventoryLocation()
                ).map(InventoryBalance::getQuantity).orElse(BigDecimal.ZERO)
            );
            if (avail.compareTo(line.quantity()) < 0) {
                conflicts.add(Map.of(
                    "barcode", barcode,
                    "requestedQty", line.quantity(),
                    "availableQty", avail,
                    "reason", "INSUFFICIENT_STOCK"
                ));
            } else {
                availableByProduct.put(cat.getProductId(), avail.subtract(line.quantity()));
                accepted.add(line);
            }
        }
        if (accepted.isEmpty()) {
            item.setStatus("FAILED_CONFLICT");
            item.setErrorMessage(objectMapper.writeValueAsString(conflicts));
            item.setSyncedAt(Instant.now());
            return;
        }
        BigDecimal subtotal = BigDecimal.ZERO;
        for (PosCheckoutLineRequest line : accepted) {
            PosCatalogItem cat = posCatalogItemRepository
                .findByTenantIdAndBarcodeAndActiveTrue(item.getTenantId(), line.barcode().trim())
                .orElseThrow(() -> new IllegalArgumentException("Unknown barcode: " + line.barcode()));
            BigDecimal unit = cat.getUnitPrice().setScale(2, RoundingMode.HALF_UP);
            String catCur = cat.getCurrencyCode().toUpperCase(Locale.ROOT);
            if (!catCur.equals(currency)) {
                unit = currencyService.convertAmount(unit, catCur, currency).setScale(2, RoundingMode.HALF_UP);
            }
            subtotal = subtotal.add(unit.multiply(line.quantity())).setScale(2, RoundingMode.HALF_UP);
        }
        List<PosTenderRequest> tenders = normalizedTenders(req.tenders(), subtotal);
        PosCheckoutRequest replayReq = new PosCheckoutRequest(
            req.customerName(),
            currency,
            req.posRegisterCode(),
            accepted,
            tenders,
            req.onAccountCustomerName(),
            false,
            req.cashierName(),
            req.outOfStockAttempts(),
            req.customerId(),
            req.loyaltyPointsRedeemed(),
            req.saleType()
        );
        posCheckoutService.checkout(replayReq);
        for (PosTenderRequest t : tenders) {
            String tt = t.tenderType().toUpperCase(Locale.ROOT);
            if ("MOMO".equals(tt) && t.reference() != null && !t.reference().isBlank()) {
                mobileMoneyReconciliationService.settle(MobileMoneyReconciliationService.PROVIDER_MTN,
                    new MobileMoneyCallbackRequest(item.getTenantId(), t.reference(), t.amount(), currency, null));
            } else if ("AIRTEL_MONEY".equals(tt) && t.reference() != null && !t.reference().isBlank()) {
                mobileMoneyReconciliationService.settle(MobileMoneyReconciliationService.PROVIDER_AIRTEL,
                    new MobileMoneyCallbackRequest(item.getTenantId(), t.reference(), t.amount(), currency, null));
            }
        }
        item.setStatus(conflicts.isEmpty() ? "SYNCED" : "SYNCED_WITH_CONFLICT");
        item.setErrorMessage(conflicts.isEmpty() ? null : objectMapper.writeValueAsString(conflicts));
        item.setSyncedAt(Instant.now());
    }

    private List<PosTenderRequest> normalizedTenders(List<PosTenderRequest> original, BigDecimal total) {
        if (original == null || original.isEmpty() || total.compareTo(BigDecimal.ZERO) <= 0) {
            return List.of(new PosTenderRequest("CASH", total.max(BigDecimal.ZERO), null));
        }
        BigDecimal sum = original.stream().map(PosTenderRequest::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sum.compareTo(BigDecimal.ZERO) <= 0) {
            return List.of(new PosTenderRequest("CASH", total, null));
        }
        List<PosTenderRequest> out = new ArrayList<>();
        BigDecimal allocated = BigDecimal.ZERO;
        for (int i = 0; i < original.size(); i++) {
            PosTenderRequest t = original.get(i);
            BigDecimal amt = (i == original.size() - 1)
                ? total.subtract(allocated)
                : total.multiply(t.amount()).divide(sum, 2, RoundingMode.HALF_UP);
            if (amt.compareTo(BigDecimal.ZERO) > 0) {
                out.add(new PosTenderRequest(t.tenderType(), amt, t.reference()));
                allocated = allocated.add(amt);
            }
        }
        if (out.isEmpty()) {
            out.add(new PosTenderRequest("CASH", total, null));
        }
        return out;
    }
}
