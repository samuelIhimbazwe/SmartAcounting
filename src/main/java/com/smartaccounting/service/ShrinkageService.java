package com.smartaccounting.service;

import com.smartaccounting.dto.LedgerFlowRequest;
import com.smartaccounting.dto.ShrinkageRequest;
import com.smartaccounting.dto.ShrinkageSummary;
import com.smartaccounting.entity.ShrinkageRecord;
import com.smartaccounting.repository.ShrinkageRecordRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ShrinkageService {
    private final ShrinkageRecordRepository shrinkageRepository;
    private final InventoryService inventoryService;
    private final LedgerFlowService ledgerFlowService;

    public ShrinkageService(ShrinkageRecordRepository shrinkageRepository,
                            InventoryService inventoryService,
                            LedgerFlowService ledgerFlowService) {
        this.shrinkageRepository = shrinkageRepository;
        this.inventoryService = inventoryService;
        this.ledgerFlowService = ledgerFlowService;
    }

    public ShrinkageRecord recordShrinkage(ShrinkageRequest request, UUID recordedBy) {
        return recordShrinkageInternal(requireTenant(), request, recordedBy);
    }

    public ShrinkageRecord recordShrinkage(String tenantId, UUID productId, String sku,
                                           String productName, BigDecimal quantity,
                                           BigDecimal unitCost, String reason,
                                           String recordedByUserId) {
        ShrinkageRequest req = new ShrinkageRequest(
            productId, sku, productName, quantity, unitCost, reason,
            "SHOP", LocalDate.now(), null);
        UUID recordedBy = recordedByUserId != null
            ? UUID.fromString(recordedByUserId) : null;
        return recordShrinkageInternal(UUID.fromString(tenantId), req, recordedBy);
    }

    private ShrinkageRecord recordShrinkageInternal(UUID tid, ShrinkageRequest request, UUID recordedBy) {
        String location = request.location() != null ? request.location() : "SHOP";
        BigDecimal unitCost = request.unitCost();
        if (unitCost == null || unitCost.signum() <= 0) {
            unitCost = inventoryService.resolveLatestUnitCost(request.productId(), location);
        }
        BigDecimal totalCost = unitCost.multiply(request.quantity());
        inventoryService.writeOffStock(request.productId(), request.quantity(), request.reason());

        UUID journalId = ledgerFlowService.postStockWriteOff(new LedgerFlowRequest(
            "Stock write-off: " + request.productName() + " — " + request.reason(),
            totalCost,
            "RWF"
        ));

        ShrinkageRecord record = new ShrinkageRecord();
        record.setId(UUID.randomUUID());
        record.setTenantId(tid);
        record.setProductId(request.productId());
        record.setSku(request.sku());
        record.setProductName(request.productName());
        record.setQuantity(request.quantity());
        record.setUnitCost(unitCost);
        record.setTotalCost(totalCost);
        record.setReason(request.reason());
        record.setRecordedBy(recordedBy != null ? recordedBy : UUID.randomUUID());
        record.setLocation(location);
        record.setIncidentDate(request.incidentDate() != null ? request.incidentDate() : LocalDate.now());
        record.setNotes(request.notes());
        record.setJournalEntryId(journalId);
        record.setCreatedAt(Instant.now());
        return shrinkageRepository.save(record);
    }

    @Transactional(readOnly = true)
    public Page<ShrinkageRecord> listShrinkage(LocalDate from, LocalDate to, Pageable pageable) {
        UUID tid = requireTenant();
        LocalDate f = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate t = to != null ? to : LocalDate.now();
        return shrinkageRepository.findByTenantIdAndIncidentDateBetweenOrderByCreatedAtDesc(tid, f, t, pageable);
    }

    @Transactional(readOnly = true)
    public ShrinkageSummary getShrinkageSummary(String tenantId, LocalDate from, LocalDate to) {
        UUID tid = UUID.fromString(tenantId);
        List<ShrinkageRecord> records = shrinkageRepository.findByTenantIdAndIncidentDateBetween(tid, from, to);
        BigDecimal totalCost = records.stream()
            .map(ShrinkageRecord::getTotalCost)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, BigDecimal> byReason = records.stream()
            .collect(Collectors.groupingBy(
                ShrinkageRecord::getReason,
                Collectors.mapping(
                    ShrinkageRecord::getTotalCost,
                    Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));
        return new ShrinkageSummary(from, to, totalCost, records.size(), byReason);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
