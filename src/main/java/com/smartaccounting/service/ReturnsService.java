package com.smartaccounting.service;

import com.smartaccounting.dto.InitiateReturnRequest;
import com.smartaccounting.dto.ReceiveStockRequest;
import com.smartaccounting.dto.ReturnLineRequest;
import com.smartaccounting.entity.PosReturn;
import com.smartaccounting.entity.PosReturnLine;
import com.smartaccounting.exception.BusinessException;
import com.smartaccounting.repository.PosReturnLineRepository;
import com.smartaccounting.repository.PosReturnRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ReturnsService {
    private static final BigDecimal APPROVAL_THRESHOLD = new BigDecimal("50000");

    private final PosReturnRepository posReturnRepository;
    private final PosReturnLineRepository posReturnLineRepository;
    private final InventoryService inventoryService;
    private final ShrinkageService shrinkageService;
    private final SalesAnalyticsService salesAnalyticsService;

    public ReturnsService(PosReturnRepository posReturnRepository,
                          PosReturnLineRepository posReturnLineRepository,
                          InventoryService inventoryService,
                          ShrinkageService shrinkageService,
                          SalesAnalyticsService salesAnalyticsService) {
        this.posReturnRepository = posReturnRepository;
        this.posReturnLineRepository = posReturnLineRepository;
        this.inventoryService = inventoryService;
        this.shrinkageService = shrinkageService;
        this.salesAnalyticsService = salesAnalyticsService;
    }

    public PosReturn initiateReturn(InitiateReturnRequest request, String cashierId) {
        UUID tid = requireTenant();
        String returnNumber = "RET-" + (posReturnRepository.countByTenantId(tid) + 1);

        BigDecimal totalRefund = request.lines().stream()
            .map(l -> l.unitPrice().multiply(l.quantity()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        boolean requiresApproval = totalRefund.compareTo(APPROVAL_THRESHOLD) > 0;

        PosReturn posReturn = new PosReturn();
        posReturn.setId(UUID.randomUUID());
        posReturn.setTenantId(tid);
        posReturn.setReturnNumber(returnNumber);
        posReturn.setOriginalTransactionId(request.originalTransactionId());
        posReturn.setReturnDate(LocalDate.now());
        posReturn.setCashierId(cashierId);
        posReturn.setTillCode(request.tillCode());
        posReturn.setReason(request.reason());
        posReturn.setStatus(requiresApproval ? "PENDING" : "APPROVED");
        posReturn.setTotalRefundAmount(totalRefund);
        posReturn.setRefundMethod(request.refundMethod());
        posReturn.setCurrencyCode("RWF");
        posReturn.setNotes(request.notes());
        posReturn.setRequiresManagerApproval(requiresApproval);
        posReturn.setCreatedAt(Instant.now());
        posReturn = posReturnRepository.save(posReturn);

        for (ReturnLineRequest line : request.lines()) {
            PosReturnLine row = new PosReturnLine();
            row.setId(UUID.randomUUID());
            row.setTenantId(tid);
            row.setReturnId(posReturn.getId());
            row.setProductId(line.productId());
            row.setSku(line.sku());
            row.setProductName(line.productName());
            row.setQuantity(line.quantity());
            row.setUnitPrice(line.unitPrice());
            row.setRefundAmount(line.unitPrice().multiply(line.quantity()));
            row.setRestock(line.restock());
            row.setCondition(line.condition() != null ? line.condition() : "RESALEABLE");
            row.setCreatedAt(Instant.now());
            posReturnLineRepository.save(row);
        }

        if (!requiresApproval) {
            processApprovedReturn(tid.toString(), posReturn.getId());
        }
        return posReturn;
    }

    public PosReturn approveReturn(UUID returnId, UUID approvedBy) {
        UUID tid = requireTenant();
        PosReturn posReturn = posReturnRepository.findByIdAndTenantId(returnId, tid)
            .orElseThrow(() -> new IllegalArgumentException("Return not found"));
        if (!"PENDING".equals(posReturn.getStatus())) {
            throw new BusinessException("Return is not in PENDING status");
        }
        posReturn.setStatus("APPROVED");
        posReturn.setApprovedBy(approvedBy);
        posReturn.setApprovedAt(Instant.now());
        posReturn = posReturnRepository.save(posReturn);
        processApprovedReturn(tid.toString(), returnId);
        return posReturn;
    }

    @Transactional(readOnly = true)
    public Page<PosReturn> listReturns(String status, Pageable pageable) {
        UUID tid = requireTenant();
        if (status == null || status.isBlank()) {
            return posReturnRepository.findByTenantIdOrderByCreatedAtDesc(tid, pageable);
        }
        return posReturnRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(tid, status, pageable);
    }

    private void processApprovedReturn(String tenantId, UUID returnId) {
        List<PosReturnLine> lines = posReturnLineRepository.findByReturnId(returnId);
        PosReturn posReturn = posReturnRepository.findById(returnId).orElseThrow();

        for (PosReturnLine line : lines) {
            if (Boolean.TRUE.equals(line.getRestock()) && "RESALEABLE".equals(line.getCondition())) {
                inventoryService.receiveStock(new ReceiveStockRequest(
                    line.getProductId(),
                    "SHOP",
                    line.getQuantity(),
                    line.getUnitPrice(),
                    posReturn.getReturnNumber(),
                    null,
                    null
                ));
            }
            if ("DAMAGED".equals(line.getCondition()) || "EXPIRED".equals(line.getCondition())) {
                shrinkageService.recordShrinkage(
                    tenantId,
                    line.getProductId(),
                    line.getSku(),
                    line.getProductName(),
                    line.getQuantity(),
                    line.getUnitPrice(),
                    line.getCondition(),
                    null
                );
            }
        }

        salesAnalyticsService.recordRefund(
            tenantId,
            posReturn.getCashierId(),
            posReturn.getCashierId(),
            posReturn.getTillCode(),
            posReturn.getTotalRefundAmount(),
            posReturn.getReturnDate()
        );

        posReturn.setStatus("COMPLETED");
        posReturnRepository.save(posReturn);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
