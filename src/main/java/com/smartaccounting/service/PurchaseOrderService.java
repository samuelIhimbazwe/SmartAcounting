package com.smartaccounting.service;

import com.smartaccounting.briefing.SalesKpiProjector;
import com.smartaccounting.dto.CreateGrnRequest;
import com.smartaccounting.dto.GrnLineRequest;
import com.smartaccounting.dto.PurchaseOrderDetail;
import com.smartaccounting.dto.PurchaseOrderLineRequest;
import com.smartaccounting.dto.ReceiveStockRequest;
import com.smartaccounting.dto.ThreeWayMatchResult;
import com.smartaccounting.dto.WorkflowCreatePurchaseOrderRequest;
import com.smartaccounting.entity.FinanceSupplier;
import com.smartaccounting.entity.GoodsReceivedNote;
import com.smartaccounting.entity.GrnLine;
import com.smartaccounting.entity.Product;
import com.smartaccounting.entity.ProductSupplierPreference;
import com.smartaccounting.entity.PurchaseOrder;
import com.smartaccounting.entity.PurchaseOrderLine;
import com.smartaccounting.entity.SupplierBill;
import com.smartaccounting.exception.BusinessException;
import com.smartaccounting.repository.FinanceSupplierRepository;
import com.smartaccounting.repository.GoodsReceivedNoteRepository;
import com.smartaccounting.repository.GrnLineRepository;
import com.smartaccounting.repository.ProductRepository;
import com.smartaccounting.repository.ProductSupplierPreferenceRepository;
import com.smartaccounting.repository.PurchaseOrderLineRepository;
import com.smartaccounting.repository.PurchaseOrderRepository;
import com.smartaccounting.repository.SupplierBillRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PurchaseOrderService {
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderLineRepository purchaseOrderLineRepository;
    private final GoodsReceivedNoteRepository grnRepository;
    private final GrnLineRepository grnLineRepository;
    private final ProductRepository productRepository;
    private final ProductSupplierPreferenceRepository productSupplierPreferenceRepository;
    private final FinanceSupplierRepository financeSupplierRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final InventoryService inventoryService;
    private final SupplierBillGrnService supplierBillGrnService;
    private final SalesKpiProjector salesKpiProjector;

    public PurchaseOrderService(PurchaseOrderRepository purchaseOrderRepository,
                                PurchaseOrderLineRepository purchaseOrderLineRepository,
                                GoodsReceivedNoteRepository grnRepository,
                                GrnLineRepository grnLineRepository,
                                ProductRepository productRepository,
                                ProductSupplierPreferenceRepository productSupplierPreferenceRepository,
                                FinanceSupplierRepository financeSupplierRepository,
                                SupplierBillRepository supplierBillRepository,
                                InventoryService inventoryService,
                                SupplierBillGrnService supplierBillGrnService,
                                SalesKpiProjector salesKpiProjector) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderLineRepository = purchaseOrderLineRepository;
        this.grnRepository = grnRepository;
        this.grnLineRepository = grnLineRepository;
        this.productRepository = productRepository;
        this.productSupplierPreferenceRepository = productSupplierPreferenceRepository;
        this.financeSupplierRepository = financeSupplierRepository;
        this.supplierBillRepository = supplierBillRepository;
        this.inventoryService = inventoryService;
        this.supplierBillGrnService = supplierBillGrnService;
        this.salesKpiProjector = salesKpiProjector;
    }

    public PurchaseOrder createPurchaseOrder(WorkflowCreatePurchaseOrderRequest request, UUID createdBy) {
        UUID tid = requireTenant();
        String poNumber = generatePoNumber(tid);

        PurchaseOrder po = new PurchaseOrder();
        po.setId(UUID.randomUUID());
        po.setTenantId(tid);
        po.setPoNumber(poNumber);
        po.setSupplierId(request.supplierId());
        po.setSupplierName(request.supplierName());
        po.setStatus("DRAFT");
        po.setOrderDate(LocalDate.now());
        po.setExpectedDeliveryDate(request.expectedDeliveryDate());
        po.setCurrencyCode(request.currencyCode() != null ? request.currencyCode() : "RWF");
        po.setNotes(request.notes());
        po.setCreatedBy(createdBy);
        po.setCreatedAt(Instant.now());
        po.setTotalAmount(BigDecimal.ZERO);
        po = purchaseOrderRepository.save(po);

        BigDecimal total = BigDecimal.ZERO;
        for (PurchaseOrderLineRequest line : request.lines()) {
            BigDecimal lineTotal = line.unitCost().multiply(line.orderedQuantity());
            total = total.add(lineTotal);
            PurchaseOrderLine pol = new PurchaseOrderLine();
            pol.setId(UUID.randomUUID());
            pol.setTenantId(tid);
            pol.setPurchaseOrderId(po.getId());
            pol.setProductId(line.productId());
            pol.setSku(line.sku());
            pol.setProductName(line.productName());
            pol.setOrderedQuantity(line.orderedQuantity());
            pol.setReceivedQuantity(BigDecimal.ZERO);
            pol.setUnitCost(line.unitCost());
            pol.setTotalCost(lineTotal);
            pol.setUnitOfMeasure("UNIT");
            pol.setStatus("PENDING");
            pol.setCreatedAt(Instant.now());
            purchaseOrderLineRepository.save(pol);
        }
        po.setTotalAmount(total);
        return purchaseOrderRepository.save(po);
    }

    public PurchaseOrder createFromLowStock(UUID productId, UUID createdBy) {
        UUID tid = requireTenant();
        Product product = productRepository.findByIdAndTenantId(productId, tid)
            .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        ProductSupplierPreference pref = productSupplierPreferenceRepository
            .findFirstByTenantIdAndProductIdAndPreferredTrueOrderByCreatedAtDesc(tid, productId)
            .orElseThrow(() -> new BusinessException(
                "No preferred supplier configured for " + product.getName() + ". Please create PO manually."));

        FinanceSupplier supplier = financeSupplierRepository.findById(pref.getSupplierId())
            .filter(s -> tid.equals(s.getTenantId()))
            .orElseThrow(() -> new BusinessException("Preferred supplier not found"));

        BigDecimal avgDailySales = salesKpiProjector.getAvgDailySalesByProduct(tid, productId);
        BigDecimal reorderQty = inventoryService.getReorderQuantity(tid, productId);
        BigDecimal suggestedQty = avgDailySales.multiply(new BigDecimal("30")).max(reorderQty);

        int leadDays = pref.getLeadTimeDays() != null ? pref.getLeadTimeDays() : 3;
        WorkflowCreatePurchaseOrderRequest request = new WorkflowCreatePurchaseOrderRequest(
            supplier.getId(),
            supplier.getSupplierName(),
            LocalDate.now().plusDays(leadDays),
            "RWF",
            null,
            List.of(new PurchaseOrderLineRequest(
                product.getId(),
                product.getSku() != null ? product.getSku() : product.getId().toString(),
                product.getName(),
                suggestedQty.max(BigDecimal.ONE),
                inventoryService.getLastCostPrice(tid, productId)
            ))
        );
        return createPurchaseOrder(request, createdBy);
    }

    @Transactional(readOnly = true)
    public Page<PurchaseOrder> listPos(String status, Pageable pageable) {
        UUID tid = requireTenant();
        if (status == null || status.isBlank()) {
            return purchaseOrderRepository.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(tid, pageable);
        }
        return purchaseOrderRepository.findByTenantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(tid, status, pageable);
    }

    @Transactional(readOnly = true)
    public PurchaseOrderDetail getPo(UUID poId) {
        UUID tid = requireTenant();
        PurchaseOrder po = purchaseOrderRepository.findByIdAndTenantIdAndDeletedAtIsNull(poId, tid)
            .orElseThrow(() -> new IllegalArgumentException("Purchase order not found"));
        return new PurchaseOrderDetail(po, purchaseOrderLineRepository.findByPurchaseOrderId(poId));
    }

    public PurchaseOrder sendPo(UUID poId, String sentVia) {
        PurchaseOrder po = loadPo(poId);
        po.setStatus("SENT");
        po.setSentVia(sentVia);
        po.setSentAt(Instant.now());
        return purchaseOrderRepository.save(po);
    }

    public PurchaseOrder confirmPo(UUID poId) {
        PurchaseOrder po = loadPo(poId);
        po.setStatus("CONFIRMED");
        return purchaseOrderRepository.save(po);
    }

    public GoodsReceivedNote createGrn(UUID poId, CreateGrnRequest request, UUID receivedBy) {
        UUID tid = requireTenant();
        PurchaseOrder po = loadPo(poId);
        String grnNumber = "GRN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        GoodsReceivedNote grn = new GoodsReceivedNote();
        grn.setId(UUID.randomUUID());
        grn.setTenantId(tid);
        grn.setGrnNumber(grnNumber);
        grn.setPurchaseOrderId(poId);
        grn.setSupplierId(po.getSupplierId());
        grn.setSupplierName(po.getSupplierName());
        grn.setReceivedDate(LocalDate.now());
        grn.setReceivedBy(receivedBy);
        grn.setStatus("DRAFT");
        grn.setNotes(request.notes());
        grn.setCreatedAt(Instant.now());
        grn = grnRepository.save(grn);

        for (GrnLineRequest lineReq : request.lines()) {
            GrnLine line = new GrnLine();
            line.setId(UUID.randomUUID());
            line.setTenantId(tid);
            line.setGrnId(grn.getId());
            line.setPoLineId(lineReq.poLineId());
            line.setProductId(lineReq.productId());
            line.setSku(lineReq.sku());
            line.setProductName(lineReq.productName());
            line.setExpectedQuantity(lineReq.expectedQuantity());
            line.setReceivedQuantity(lineReq.receivedQuantity());
            line.setRejectedQuantity(BigDecimal.ZERO);
            line.setUnitCost(lineReq.unitCost());
            line.setLotCode(lineReq.lotCode());
            line.setExpiryDate(lineReq.expiryDate());
            line.setLocation(lineReq.location() != null ? lineReq.location() : "SHOP");
            line.setCreatedAt(Instant.now());
            grnLineRepository.save(line);
        }
        return grn;
    }

    public GoodsReceivedNote confirmGrn(UUID grnId) {
        UUID tid = requireTenant();
        GoodsReceivedNote grn = grnRepository.findByIdAndTenantId(grnId, tid)
            .orElseThrow(() -> new IllegalArgumentException("GRN not found"));
        if (!"DRAFT".equals(grn.getStatus())) {
            throw new BusinessException("GRN already confirmed");
        }

        List<GrnLine> lines = grnLineRepository.findByTenantIdAndGrnId(tid, grnId);
        for (GrnLine line : lines) {
            inventoryService.receiveStock(new ReceiveStockRequest(
                line.getProductId(),
                line.getLocation() != null ? line.getLocation() : "SHOP",
                line.getReceivedQuantity(),
                line.getUnitCost(),
                grn.getGrnNumber(),
                line.getLotCode(),
                line.getExpiryDate()
            ));

            if (line.getPoLineId() != null) {
                PurchaseOrderLine poLine = purchaseOrderLineRepository.findById(line.getPoLineId())
                    .orElseThrow();
                poLine.setReceivedQuantity(poLine.getReceivedQuantity().add(line.getReceivedQuantity()));
                poLine.setStatus(poLine.getReceivedQuantity().compareTo(poLine.getOrderedQuantity()) >= 0
                    ? "RECEIVED" : "PARTIALLY_RECEIVED");
                purchaseOrderLineRepository.save(poLine);
            }
        }

        BigDecimal grnTotal = lines.stream()
            .map(l -> l.getUnitCost().multiply(l.getReceivedQuantity()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        supplierBillGrnService.createFromGrn(grn, grnTotal);

        if (grn.getPurchaseOrderId() != null) {
            updatePoStatus(tid, grn.getPurchaseOrderId());
        }

        grn.setStatus("POSTED");
        return grnRepository.save(grn);
    }

    @Transactional(readOnly = true)
    public ThreeWayMatchResult checkThreeWayMatch(UUID purchaseOrderId, UUID supplierBillId) {
        UUID tid = requireTenant();
        PurchaseOrder po = purchaseOrderRepository.findByIdAndTenantIdAndDeletedAtIsNull(purchaseOrderId, tid)
            .orElseThrow();
        SupplierBill bill = supplierBillRepository.findByIdAndDeletedAtIsNull(supplierBillId)
            .filter(b -> tid.equals(b.getTenantId()))
            .orElseThrow(() -> new IllegalArgumentException("Supplier bill not found"));

        BigDecimal poAmount = po.getTotalAmount();
        BigDecimal billAmount = bill.getAmount();
        BigDecimal grnAmount = getGrnTotal(tid, purchaseOrderId);
        BigDecimal variance = billAmount.subtract(poAmount);
        BigDecimal variancePct = poAmount.compareTo(BigDecimal.ZERO) > 0
            ? variance.divide(poAmount, 4, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        return new ThreeWayMatchResult(
            purchaseOrderId,
            supplierBillId,
            poAmount,
            grnAmount,
            billAmount,
            variance,
            variancePct,
            variance.abs().compareTo(new BigDecimal("0.01")) <= 0,
            variancePct.abs().compareTo(new BigDecimal("0.05")) > 0
        );
    }

    private BigDecimal getGrnTotal(UUID tenantId, UUID purchaseOrderId) {
        return grnRepository.findAll().stream()
            .filter(g -> tenantId.equals(g.getTenantId()) && purchaseOrderId.equals(g.getPurchaseOrderId()))
            .flatMap(g -> grnLineRepository.findByGrnId(g.getId()).stream())
            .map(l -> l.getUnitCost().multiply(l.getReceivedQuantity()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void updatePoStatus(UUID tenantId, UUID purchaseOrderId) {
        List<PurchaseOrderLine> lines = purchaseOrderLineRepository.findByPurchaseOrderId(purchaseOrderId);
        boolean allReceived = lines.stream().allMatch(l -> "RECEIVED".equals(l.getStatus()));
        boolean anyReceived = lines.stream().anyMatch(l ->
            "RECEIVED".equals(l.getStatus()) || "PARTIALLY_RECEIVED".equals(l.getStatus()));
        PurchaseOrder po = purchaseOrderRepository.findByIdAndTenantIdAndDeletedAtIsNull(purchaseOrderId, tenantId)
            .orElseThrow();
        if (allReceived) {
            po.setStatus("RECEIVED");
            po.setActualDeliveryDate(LocalDate.now());
        } else if (anyReceived) {
            po.setStatus("PARTIALLY_RECEIVED");
        }
        purchaseOrderRepository.save(po);
    }

    private PurchaseOrder loadPo(UUID poId) {
        return purchaseOrderRepository.findByIdAndTenantIdAndDeletedAtIsNull(poId, requireTenant())
            .orElseThrow(() -> new IllegalArgumentException("Purchase order not found"));
    }

    private String generatePoNumber(UUID tenantId) {
        long seq = purchaseOrderRepository.countByTenantIdAndDeletedAtIsNull(tenantId) + 1;
        return "PO-" + String.format("%05d", seq);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
