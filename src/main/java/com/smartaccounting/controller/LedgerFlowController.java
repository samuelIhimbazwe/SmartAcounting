package com.smartaccounting.controller;

import com.smartaccounting.dto.LedgerFlowRequest;
import com.smartaccounting.service.LedgerFlowService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/flows")
public class LedgerFlowController {
    private final LedgerFlowService service;
    public LedgerFlowController(LedgerFlowService service) { this.service = service; }

    @PostMapping("/invoice-issued")
    @PreAuthorize(PermissionExpressions.FINANCE_WRITE)
    public Map<String, UUID> invoiceIssued(@RequestBody @Valid LedgerFlowRequest req) {
        return Map.of("journalEntryId", service.postInvoiceIssued(req));
    }

    @PostMapping("/payment-received")
    @PreAuthorize(PermissionExpressions.FINANCE_WRITE)
    public Map<String, UUID> paymentReceived(@RequestBody @Valid LedgerFlowRequest req) {
        return Map.of("journalEntryId", service.postPaymentReceived(req));
    }

    @PostMapping("/goods-received")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public Map<String, UUID> goodsReceived(@RequestBody @Valid LedgerFlowRequest req) {
        return Map.of("journalEntryId", service.postGoodsReceived(req));
    }

    @PostMapping("/stock-writeoff")
    @PreAuthorize(PermissionExpressions.INVENTORY_SHRINKAGE)
    public Map<String, UUID> stockWriteoff(@RequestBody @Valid LedgerFlowRequest req) {
        return Map.of("journalEntryId", service.postStockWriteOff(req));
    }
}
