package com.smartaccounting.controller;

import com.smartaccounting.dto.CreatePosCatalogItemRequest;
import com.smartaccounting.dto.PosCheckoutRequest;
import com.smartaccounting.dto.PosReceiptPrintRequest;
import com.smartaccounting.entity.PosCatalogItem;
import com.smartaccounting.service.PosCheckoutService;
import com.smartaccounting.service.PosReceiptService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Point of Sale: barcode catalog lookup, split tender checkout, thermal-friendly receipt payload.
 */
@RestController
@RequestMapping("/api/v1/pos")
public class PosController {

    private final PosCheckoutService posCheckoutService;
    private final PosReceiptService posReceiptService;

    public PosController(PosCheckoutService posCheckoutService, PosReceiptService posReceiptService) {
        this.posCheckoutService = posCheckoutService;
        this.posReceiptService = posReceiptService;
    }

    @GetMapping("/catalog/scan")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public Map<String, Object> scan(@RequestParam String barcode) {
        PosCatalogItem item = posCheckoutService.scanBarcode(barcode);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("catalogItemId", item.getId());
        m.put("barcode", item.getBarcode());
        m.put("displayName", item.getDisplayName());
        m.put("unitPrice", item.getUnitPrice());
        m.put("currencyCode", item.getCurrencyCode());
        m.put("sku", item.getSku());
        if (item.getProductId() != null) {
            m.put("productId", item.getProductId());
        }
        if (item.getReorderPoint() != null) {
            m.put("reorderPoint", item.getReorderPoint());
        }
        return m;
    }

    @PostMapping("/catalog/items")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public Map<String, UUID> createCatalogItem(@RequestBody @Valid CreatePosCatalogItemRequest req) {
        return Map.of("catalogItemId", posCheckoutService.upsertCatalogItem(req));
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public Map<String, Object> checkout(@RequestBody @Valid PosCheckoutRequest req) {
        return posCheckoutService.checkout(req);
    }

    @GetMapping("/receipt/{salesOrderId}")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public ResponseEntity<Map<String, Object>> receipt(@PathVariable UUID salesOrderId) {
        return ResponseEntity.ok(posCheckoutService.receipt(salesOrderId));
    }

    @PostMapping("/receipts/print")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public ResponseEntity<Map<String, Object>> printReceipt(@RequestBody @Valid PosReceiptPrintRequest req) {
        return ResponseEntity.ok(posReceiptService.print(req.transactionId(), false));
    }

    @PostMapping("/receipts/{transactionId}/reprint")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public ResponseEntity<Map<String, Object>> reprintReceipt(@PathVariable UUID transactionId) {
        return ResponseEntity.ok(posReceiptService.print(transactionId, true));
    }
}
