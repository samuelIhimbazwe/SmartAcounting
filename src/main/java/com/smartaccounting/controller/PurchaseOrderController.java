package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateGrnRequest;
import com.smartaccounting.dto.PurchaseOrderDetail;
import com.smartaccounting.dto.ThreeWayMatchResult;
import com.smartaccounting.dto.WorkflowCreatePurchaseOrderRequest;
import com.smartaccounting.entity.GoodsReceivedNote;
import com.smartaccounting.entity.PurchaseOrder;
import com.smartaccounting.service.PurchaseOrderService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/procurement/purchase-orders")
public class PurchaseOrderController {
    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    @PostMapping("/create")
    @PreAuthorize(PermissionExpressions.PROCUREMENT_WRITE)
    public ResponseEntity<PurchaseOrder> createPoLegacy(@RequestBody @Valid WorkflowCreatePurchaseOrderRequest request) {
        return ResponseEntity.ok(purchaseOrderService.createPurchaseOrder(request, currentUserId()));
    }

    @PostMapping("/from-low-stock/{productId}")
    @PreAuthorize(PermissionExpressions.PROCUREMENT_WRITE)
    public ResponseEntity<PurchaseOrder> createFromLowStock(@PathVariable UUID productId) {
        return ResponseEntity.ok(purchaseOrderService.createFromLowStock(productId, currentUserId()));
    }

    @GetMapping
    @PreAuthorize(PermissionExpressions.PROCUREMENT_READ)
    public ResponseEntity<Page<PurchaseOrder>> listPos(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(purchaseOrderService.listPos(status, PageRequest.of(page, size)));
    }

    @GetMapping("/{poId}")
    @PreAuthorize(PermissionExpressions.PROCUREMENT_READ)
    public ResponseEntity<PurchaseOrderDetail> getPo(@PathVariable UUID poId) {
        return ResponseEntity.ok(purchaseOrderService.getPo(poId));
    }

    @PostMapping("/{poId}/send")
    @PreAuthorize(PermissionExpressions.PROCUREMENT_WRITE)
    public ResponseEntity<PurchaseOrder> sendPo(
        @PathVariable UUID poId,
        @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(purchaseOrderService.sendPo(poId, body.get("sentVia")));
    }

    @PostMapping("/{poId}/confirm")
    @PreAuthorize(PermissionExpressions.PROCUREMENT_WRITE)
    public ResponseEntity<PurchaseOrder> confirmPo(@PathVariable UUID poId) {
        return ResponseEntity.ok(purchaseOrderService.confirmPo(poId));
    }

    @PostMapping("/{poId}/grn")
    @PreAuthorize(PermissionExpressions.PROCUREMENT_WRITE)
    public ResponseEntity<GoodsReceivedNote> createGrn(
        @PathVariable UUID poId,
        @RequestBody @Valid CreateGrnRequest request) {
        return ResponseEntity.ok(purchaseOrderService.createGrn(poId, request, currentUserId()));
    }

    @PostMapping("/grn/{grnId}/confirm")
    @PreAuthorize(PermissionExpressions.PROCUREMENT_READ)
    public ResponseEntity<GoodsReceivedNote> confirmGrn(@PathVariable UUID grnId) {
        return ResponseEntity.ok(purchaseOrderService.confirmGrn(grnId));
    }

    @GetMapping("/{poId}/three-way-match/{billId}")
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public ResponseEntity<ThreeWayMatchResult> threeWayMatch(
        @PathVariable UUID poId,
        @PathVariable UUID billId) {
        return ResponseEntity.ok(purchaseOrderService.checkThreeWayMatch(poId, billId));
    }

    private UUID currentUserId() {
        return TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
    }
}
