package com.smartchain.controller;

import com.smartchain.dto.LedgerFlowRequest;
import com.smartchain.service.LedgerFlowService;
import jakarta.validation.Valid;
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
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> invoiceIssued(@RequestBody @Valid LedgerFlowRequest req) {
        return Map.of("journalEntryId", service.postInvoiceIssued(req));
    }

    @PostMapping("/payment-received")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> paymentReceived(@RequestBody @Valid LedgerFlowRequest req) {
        return Map.of("journalEntryId", service.postPaymentReceived(req));
    }

    @PostMapping("/goods-received")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('OPS_MANAGER') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> goodsReceived(@RequestBody @Valid LedgerFlowRequest req) {
        return Map.of("journalEntryId", service.postGoodsReceived(req));
    }

    @PostMapping("/stock-writeoff")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('OPS_MANAGER') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> stockWriteoff(@RequestBody @Valid LedgerFlowRequest req) {
        return Map.of("journalEntryId", service.postStockWriteOff(req));
    }
}
