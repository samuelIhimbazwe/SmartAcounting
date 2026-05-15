package com.smartaccounting.controller;

import com.smartaccounting.dto.CreatePromotionRequest;
import com.smartaccounting.dto.PromotionPerformanceReport;
import com.smartaccounting.entity.Promotion;
import com.smartaccounting.service.PromotionService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/promotions")
public class PromotionController {
    private final PromotionService promotionService;

    public PromotionController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'SALES_MANAGER', 'MARKETING_MANAGER')")
    public ResponseEntity<Promotion> createPromotion(@RequestBody @Valid CreatePromotionRequest request) {
        UUID createdBy = TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
        return ResponseEntity.ok(promotionService.createPromotion(request, createdBy));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'SALES_MANAGER', 'MARKETING_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<Page<Promotion>> listPromotions(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(promotionService.listPromotions(status, PageRequest.of(page, size)));
    }

    @PatchMapping("/{promotionId}/status")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'SALES_MANAGER', 'MARKETING_MANAGER')")
    public ResponseEntity<Promotion> updateStatus(
        @PathVariable UUID promotionId,
        @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(promotionService.updateStatus(promotionId, body.get("status")));
    }

    @GetMapping("/{promotionId}/performance")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'SALES_MANAGER', 'MARKETING_MANAGER')")
    public ResponseEntity<PromotionPerformanceReport> getPerformance(@PathVariable UUID promotionId) {
        return ResponseEntity.ok(promotionService.getPerformanceReport(
            TenantContext.tenantId().toString(), promotionId));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'SALES_MANAGER', 'MARKETING_MANAGER', 'OPS_MANAGER')")
    public ResponseEntity<List<Promotion>> getActivePromotions() {
        return ResponseEntity.ok(promotionService.getActivePromotions());
    }
}
