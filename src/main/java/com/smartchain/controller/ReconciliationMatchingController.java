package com.smartchain.controller;

import com.smartchain.entity.ReconciliationMatchItem;
import com.smartchain.service.ReconciliationMatchingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounting/reconciliation")
public class ReconciliationMatchingController {
    private final ReconciliationMatchingService service;

    public ReconciliationMatchingController(ReconciliationMatchingService service) {
        this.service = service;
    }

    @PostMapping("/auto-match")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, Integer> autoMatch() {
        return Map.of("matchedItems", service.autoMatch());
    }

    @GetMapping("/unmatched")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public List<ReconciliationMatchItem> unmatched(@RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "50") int size) {
        return service.unmatchedQueue(page, size);
    }
}
