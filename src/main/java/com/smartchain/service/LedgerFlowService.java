package com.smartchain.service;

import com.smartchain.dto.LedgerFlowRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
public class LedgerFlowService {
    private final FinanceService financeService;

    public LedgerFlowService(FinanceService financeService) {
        this.financeService = financeService;
    }

    @Transactional
    public UUID postInvoiceIssued(LedgerFlowRequest req) {
        return financeService.createJournalEntry(new com.smartchain.dto.CreateJournalEntryRequest(
            LocalDate.now(), req.description(), "ACCOUNTS_RECEIVABLE", "REVENUE", req.amount(), req.currencyCode()
        ));
    }

    @Transactional
    public UUID postPaymentReceived(LedgerFlowRequest req) {
        return financeService.createJournalEntry(new com.smartchain.dto.CreateJournalEntryRequest(
            LocalDate.now(), req.description(), "BANK_CASH", "ACCOUNTS_RECEIVABLE", req.amount(), req.currencyCode()
        ));
    }

    @Transactional
    public UUID postGoodsReceived(LedgerFlowRequest req) {
        return financeService.createJournalEntry(new com.smartchain.dto.CreateJournalEntryRequest(
            LocalDate.now(), req.description(), "INVENTORY_ASSET", "ACCOUNTS_PAYABLE", req.amount(), req.currencyCode()
        ));
    }

    @Transactional
    public UUID postStockWriteOff(LedgerFlowRequest req) {
        return financeService.createJournalEntry(new com.smartchain.dto.CreateJournalEntryRequest(
            LocalDate.now(), req.description(), "COGS_LOSS", "INVENTORY_ASSET", req.amount(), req.currencyCode()
        ));
    }
}
