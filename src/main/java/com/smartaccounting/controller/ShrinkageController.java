package com.smartaccounting.controller;

import com.smartaccounting.dto.ShrinkageRequest;
import com.smartaccounting.dto.ShrinkageSummary;
import com.smartaccounting.entity.ShrinkageRecord;
import com.smartaccounting.service.ShrinkageService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory/shrinkage")
public class ShrinkageController {
    private final ShrinkageService shrinkageService;

    public ShrinkageController(ShrinkageService shrinkageService) {
        this.shrinkageService = shrinkageService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'OPS_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<ShrinkageRecord> recordShrinkage(@RequestBody @Valid ShrinkageRequest request) {
        UUID recordedBy = TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
        return ResponseEntity.ok(shrinkageService.recordShrinkage(request, recordedBy));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'OPS_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<Page<ShrinkageRecord>> listShrinkage(
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        LocalDate f = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(30);
        LocalDate t = to != null ? LocalDate.parse(to) : LocalDate.now();
        return ResponseEntity.ok(shrinkageService.listShrinkage(f, t, PageRequest.of(page, size)));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'OPS_MANAGER')")
    public ResponseEntity<ShrinkageSummary> getSummary(
        @RequestParam String from,
        @RequestParam String to) {
        return ResponseEntity.ok(shrinkageService.getShrinkageSummary(
            TenantContext.tenantId().toString(),
            LocalDate.parse(from),
            LocalDate.parse(to)));
    }
}
