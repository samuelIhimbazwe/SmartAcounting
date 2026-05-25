package com.smartaccounting.controller;

import com.smartaccounting.entity.ReconciliationMatchItem;
import com.smartaccounting.service.ReconciliationMatchingService;
import com.smartaccounting.security.PermissionExpressions;
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
    @PreAuthorize(PermissionExpressions.FINANCE_WRITE)
    public Map<String, Integer> autoMatch() {
        return Map.of("matchedItems", service.autoMatch());
    }

    @GetMapping("/unmatched")
    @PreAuthorize(PermissionExpressions.FINANCE_WRITE)
    public List<ReconciliationMatchItem> unmatched(@RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "50") int size) {
        return service.unmatchedQueue(page, size);
    }
}
