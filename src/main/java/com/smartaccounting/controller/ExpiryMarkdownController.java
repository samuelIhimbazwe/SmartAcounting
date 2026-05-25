package com.smartaccounting.controller;

import com.smartaccounting.entity.Promotion;
import com.smartaccounting.service.ExpiryMarkdownService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory/expiry-markdown")
public class ExpiryMarkdownController {
    private final ExpiryMarkdownService expiryMarkdownService;

    public ExpiryMarkdownController(ExpiryMarkdownService expiryMarkdownService) {
        this.expiryMarkdownService = expiryMarkdownService;
    }

    @PostMapping
    @PreAuthorize(PermissionExpressions.MARKETING_ACCESS)
    public ResponseEntity<List<Promotion>> createMarkdownPromotions(
        @RequestParam(defaultValue = "7") int daysAhead,
        @RequestParam(defaultValue = "0.15") BigDecimal discountPercent) {
        UUID createdBy = TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
        return ResponseEntity.ok(expiryMarkdownService.createExpiryMarkdownPromotions(
            daysAhead, discountPercent, createdBy));
    }
}
