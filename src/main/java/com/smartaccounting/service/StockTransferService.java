package com.smartaccounting.service;

import com.smartaccounting.dto.CreateStockTransferRequest;
import com.smartaccounting.dto.ReceiveStockTransferRequest;
import com.smartaccounting.entity.StockLevel;
import com.smartaccounting.entity.StockTransfer;
import com.smartaccounting.entity.StockTransferLine;
import com.smartaccounting.exception.BusinessException;
import com.smartaccounting.repository.StockLevelRepository;
import com.smartaccounting.repository.StockTransferLineRepository;
import com.smartaccounting.repository.StockTransferRepository;
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
public class StockTransferService {
    private final StockTransferRepository transferRepository;
    private final StockTransferLineRepository lineRepository;
    private final StockLevelRepository stockLevelRepository;
    private final LocationService locationService;

    public StockTransferService(
        StockTransferRepository transferRepository,
        StockTransferLineRepository lineRepository,
        StockLevelRepository stockLevelRepository,
        LocationService locationService
    ) {
        this.transferRepository = transferRepository;
        this.lineRepository = lineRepository;
        this.stockLevelRepository = stockLevelRepository;
        this.locationService = locationService;
    }

    public Map<String, Object> create(CreateStockTransferRequest req) {
        UUID tenantId = requireTenant();
        UUID fromLocationId = locationService.resolveContextLocationId();
        if (fromLocationId.equals(req.toLocationId())) {
            throw new BusinessException("Cannot transfer to the same location");
        }
        locationService.requireLocationAccess(req.toLocationId());

        StockTransfer transfer = new StockTransfer();
        transfer.setId(UUID.randomUUID());
        transfer.setTenantId(tenantId);
        transfer.setFromLocationId(fromLocationId);
        transfer.setToLocationId(req.toLocationId());
        transfer.setStatus("IN_TRANSIT");
        transfer.setCreatedBy(requireUser());
        transfer.setCreatedAt(Instant.now());
        transferRepository.save(transfer);

        for (CreateStockTransferRequest.Line line : req.lines()) {
            BigDecimal qty = line.qty().setScale(4, RoundingMode.HALF_UP);
            if (qty.signum() <= 0) {
                throw new BusinessException("Quantity must be positive");
            }
            adjustStock(tenantId, fromLocationId, line.productId(), line.variantId(), qty.negate());

            StockTransferLine row = new StockTransferLine();
            row.setId(UUID.randomUUID());
            row.setTransferId(transfer.getId());
            row.setProductId(line.productId());
            row.setVariantId(line.variantId());
            row.setQty(qty);
            lineRepository.save(row);
        }
        return toMap(transfer, lineRepository.findByTransferId(transfer.getId()));
    }

    public Map<String, Object> receive(UUID transferId, ReceiveStockTransferRequest req) {
        UUID tenantId = requireTenant();
        UUID locationId = locationService.resolveContextLocationId();
        StockTransfer transfer = transferRepository.findByIdAndTenantId(transferId, tenantId)
            .orElseThrow(() -> new BusinessException("Transfer not found"));
        if (!transfer.getToLocationId().equals(locationId)) {
            throw new BusinessException("Transfer is not for this location");
        }
        if (!"IN_TRANSIT".equals(transfer.getStatus())) {
            throw new BusinessException("Transfer is not in transit");
        }

        for (ReceiveStockTransferRequest.Line line : req.lines()) {
            BigDecimal qty = line.qtyReceived().setScale(4, RoundingMode.HALF_UP);
            if (qty.signum() <= 0) {
                continue;
            }
            adjustStock(
                tenantId,
                transfer.getToLocationId(),
                line.productId(),
                line.variantId(),
                qty);
        }
        transfer.setStatus("RECEIVED");
        transfer.setReceivedAt(Instant.now());
        transferRepository.save(transfer);
        return toMap(transfer, lineRepository.findByTransferId(transferId));
    }

    public List<Map<String, Object>> listIncoming() {
        UUID tenantId = requireTenant();
        UUID locationId = locationService.resolveContextLocationId();
        return transferRepository
            .findByTenantIdAndToLocationIdAndStatusOrderByCreatedAtDesc(
                tenantId, locationId, "IN_TRANSIT")
            .stream()
            .map(t -> toMap(t, lineRepository.findByTransferId(t.getId())))
            .toList();
    }

    private void adjustStock(
        UUID tenantId,
        UUID locationId,
        UUID productId,
        UUID variantId,
        BigDecimal delta
    ) {
        StockLevel level = stockLevelRepository
            .findByTenantIdAndLocationIdAndProductIdAndVariantId(
                tenantId, locationId, productId, variantId)
            .orElseGet(() -> {
                StockLevel s = new StockLevel();
                s.setId(UUID.randomUUID());
                s.setTenantId(tenantId);
                s.setLocationId(locationId);
                s.setProductId(productId);
                s.setVariantId(variantId);
                s.setQty(BigDecimal.ZERO);
                s.setReorderPoint(BigDecimal.ZERO);
                s.setReorderQty(BigDecimal.ZERO);
                return s;
            });
        BigDecimal next = level.getQty().add(delta);
        if (next.signum() < 0) {
            throw new BusinessException("Insufficient stock at source location");
        }
        level.setQty(next);
        stockLevelRepository.save(level);
    }

    private Map<String, Object> toMap(StockTransfer t, List<StockTransferLine> lines) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("fromLocationId", t.getFromLocationId());
        m.put("toLocationId", t.getToLocationId());
        m.put("status", t.getStatus());
        m.put("createdBy", t.getCreatedBy());
        m.put("createdAt", t.getCreatedAt());
        m.put("receivedAt", t.getReceivedAt());
        m.put("lines", lines.stream().map(l -> Map.of(
            "id", l.getId(),
            "productId", l.getProductId(),
            "variantId", l.getVariantId(),
            "qty", l.getQty()
        )).toList());
        return m;
    }

    private UUID requireTenant() {
        return TenantContext.tenantId();
    }

    private UUID requireUser() {
        return TenantContext.userId();
    }
}
