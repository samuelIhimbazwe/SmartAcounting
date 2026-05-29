package com.smartaccounting.controller;

import com.smartaccounting.dto.InitiateReturnRequest;
import com.smartaccounting.entity.PosReturn;
import com.smartaccounting.service.ReturnsService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pos/returns")
public class ReturnsController {
    private final ReturnsService returnsService;

    public ReturnsController(ReturnsService returnsService) {
        this.returnsService = returnsService;
    }

    @PostMapping
    @PreAuthorize(PermissionExpressions.POS_RETURNS)
    public ResponseEntity<PosReturn> initiateReturn(@RequestBody @Valid InitiateReturnRequest request) {
        String cashierId = TenantContext.userId() != null
            ? TenantContext.userId().toString() : "unknown";
        return ResponseEntity.ok(returnsService.initiateReturn(request, cashierId));
    }

    @PostMapping("/{returnId}/approve")
    @PreAuthorize(PermissionExpressions.POS_RETURNS)
    public ResponseEntity<PosReturn> approveReturn(@PathVariable UUID returnId) {
        UUID approvedBy = TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
        return ResponseEntity.ok(returnsService.approveReturn(returnId, approvedBy));
    }

    @GetMapping
    @PreAuthorize(PermissionExpressions.POS_RETURNS)
    public ResponseEntity<Page<Map<String, Object>>> listReturns(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(returnsService.listReturnSummaries(fromDate, toDate, status, PageRequest.of(page, size)));
    }
}
