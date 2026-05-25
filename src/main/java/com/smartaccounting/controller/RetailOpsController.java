package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateProductRequest;
import com.smartaccounting.dto.PosTillCloseRequest;
import com.smartaccounting.dto.BarcodeLabelBatchItemRequest;
import com.smartaccounting.service.RetailOpsService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/retail")
public class RetailOpsController {

    private final RetailOpsService retailOpsService;

    public RetailOpsController(RetailOpsService retailOpsService) {
        this.retailOpsService = retailOpsService;
    }

    @GetMapping("/products")
    @PreAuthorize(PermissionExpressions.RETAIL_OPS)
    public List<Map<String, Object>> listProducts() {
        return retailOpsService.listProducts();
    }

    @PostMapping("/products")
    @PreAuthorize(PermissionExpressions.RETAIL_OPS)
    public Map<String, UUID> createProduct(@RequestBody @Valid CreateProductRequest req) {
        return Map.of("productId", retailOpsService.createProduct(req));
    }

    @GetMapping("/products/{productId}/barcode-label")
    @PreAuthorize(PermissionExpressions.RETAIL_OPS)
    public Map<String, Object> barcodeLabel(@PathVariable UUID productId) {
        return retailOpsService.productBarcodeLabel(productId);
    }

    @PostMapping("/products/barcode-labels/batch")
    @PreAuthorize(PermissionExpressions.RETAIL_OPS)
    public Map<String, Object> barcodeLabelBatch(@RequestBody @Valid List<@Valid BarcodeLabelBatchItemRequest> requests) {
        return retailOpsService.productBarcodeLabelBatch(requests);
    }

    @GetMapping("/till/expected")
    @PreAuthorize(PermissionExpressions.RETAIL_OPS)
    public Map<String, Object> tillExpected(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate,
        @RequestParam String posRegisterCode
    ) {
        return retailOpsService.expectedTill(businessDate, posRegisterCode);
    }

    @PostMapping("/till/close")
    @PreAuthorize(PermissionExpressions.RETAIL_OPS)
    public Map<String, Object> tillClose(@RequestBody @Valid PosTillCloseRequest req) {
        return retailOpsService.closeTill(req);
    }
}
