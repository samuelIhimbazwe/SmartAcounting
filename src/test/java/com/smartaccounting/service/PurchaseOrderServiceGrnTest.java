package com.smartaccounting.service;

import com.smartaccounting.dto.CreateGrnRequest;
import com.smartaccounting.dto.GrnLineRequest;
import com.smartaccounting.entity.GoodsReceivedNote;
import com.smartaccounting.entity.GrnLine;
import com.smartaccounting.entity.PurchaseOrder;
import com.smartaccounting.entity.PurchaseOrderLine;
import com.smartaccounting.entity.ShrinkageRecord;
import com.smartaccounting.repository.GoodsReceivedNoteRepository;
import com.smartaccounting.repository.GrnLineRepository;
import com.smartaccounting.repository.ProductRepository;
import com.smartaccounting.repository.ProductSupplierPreferenceRepository;
import com.smartaccounting.repository.PurchaseOrderLineRepository;
import com.smartaccounting.repository.PurchaseOrderRepository;
import com.smartaccounting.repository.SupplierBillRepository;
import com.smartaccounting.repository.FinanceSupplierRepository;
import com.smartaccounting.briefing.SalesKpiProjector;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceGrnTest {
    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private PurchaseOrderLineRepository purchaseOrderLineRepository;
    @Mock private GoodsReceivedNoteRepository grnRepository;
    @Mock private GrnLineRepository grnLineRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductSupplierPreferenceRepository productSupplierPreferenceRepository;
    @Mock private FinanceSupplierRepository financeSupplierRepository;
    @Mock private SupplierBillRepository supplierBillRepository;
    @Mock private InventoryService inventoryService;
    @Mock private SupplierBillGrnService supplierBillGrnService;
    @Mock private SalesKpiProjector salesKpiProjector;
    @Mock private ShrinkageService shrinkageService;

    private PurchaseOrderService service;
    private final UUID tenant = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private final UUID user = UUID.randomUUID();
    private final UUID poId = UUID.randomUUID();
    private final UUID grnId = UUID.randomUUID();
    private final UUID poLineId = UUID.randomUUID();
    private final UUID productId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new PurchaseOrderService(
            purchaseOrderRepository,
            purchaseOrderLineRepository,
            grnRepository,
            grnLineRepository,
            productRepository,
            productSupplierPreferenceRepository,
            financeSupplierRepository,
            supplierBillRepository,
            inventoryService,
            supplierBillGrnService,
            salesKpiProjector,
            shrinkageService
        );
        TenantContext.set(tenant, user);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void confirmGrnBillsAcceptedQtyOnlyAndRecordsShrinkageForRejected() {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setTenantId(tenant);
        po.setSupplierId(UUID.randomUUID());
        po.setSupplierName("Supplier A");
        when(purchaseOrderRepository.findByIdAndTenantIdAndDeletedAtIsNull(poId, tenant)).thenReturn(Optional.of(po));

        GoodsReceivedNote grn = new GoodsReceivedNote();
        grn.setId(grnId);
        grn.setTenantId(tenant);
        grn.setGrnNumber("GRN-TEST");
        grn.setPurchaseOrderId(poId);
        grn.setSupplierId(po.getSupplierId());
        grn.setSupplierName(po.getSupplierName());
        grn.setReceivedBy(user);
        grn.setStatus("DRAFT");
        grn.setAllowExpiredReceipt(false);
        when(grnRepository.findByIdAndTenantId(grnId, tenant)).thenReturn(Optional.of(grn));

        GrnLine line = new GrnLine();
        line.setId(UUID.randomUUID());
        line.setTenantId(tenant);
        line.setGrnId(grnId);
        line.setPoLineId(poLineId);
        line.setProductId(productId);
        line.setSku("SKU-1");
        line.setProductName("Milk");
        line.setReceivedQuantity(new BigDecimal("10"));
        line.setRejectedQuantity(new BigDecimal("2"));
        line.setUnitCost(new BigDecimal("100"));
        line.setLocation("SHOP");
        when(grnLineRepository.findByTenantIdAndGrnId(tenant, grnId)).thenReturn(List.of(line));

        PurchaseOrderLine poLine = new PurchaseOrderLine();
        poLine.setId(poLineId);
        poLine.setOrderedQuantity(new BigDecimal("10"));
        poLine.setReceivedQuantity(BigDecimal.ZERO);
        when(purchaseOrderLineRepository.findById(poLineId)).thenReturn(Optional.of(poLine));
        when(purchaseOrderLineRepository.findByPurchaseOrderId(poId)).thenReturn(List.of(poLine));
        when(purchaseOrderRepository.findByIdAndTenantIdAndDeletedAtIsNull(poId, tenant)).thenReturn(Optional.of(po));

        when(shrinkageService.recordShrinkage(any(), any(), any(), any(), any(), any(), any(), any()))
            .thenReturn(new ShrinkageRecord());

        service.confirmGrn(grnId);

        ArgumentCaptor<com.smartaccounting.dto.ReceiveStockRequest> receiveCaptor =
            ArgumentCaptor.forClass(com.smartaccounting.dto.ReceiveStockRequest.class);
        verify(inventoryService).receiveStock(receiveCaptor.capture());
        assertThat(receiveCaptor.getValue().quantity()).isEqualByComparingTo("8");

        verify(supplierBillGrnService).createFromGrn(
            any(GoodsReceivedNote.class),
            org.mockito.ArgumentMatchers.argThat(b -> b.compareTo(new BigDecimal("800")) == 0));
        verify(shrinkageService).recordShrinkage(
            eq(tenant.toString()),
            eq(productId),
            eq("SKU-1"),
            eq("Milk"),
            eq(new BigDecimal("2")),
            eq(new BigDecimal("100")),
            eq("GRN_REJECTED"),
            eq(user.toString())
        );
    }
}
