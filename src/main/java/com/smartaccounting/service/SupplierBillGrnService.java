package com.smartaccounting.service;

import com.smartaccounting.dto.CreateSupplierBillRequest;
import com.smartaccounting.entity.GoodsReceivedNote;
import com.smartaccounting.entity.SupplierBill;
import com.smartaccounting.repository.SupplierBillRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class SupplierBillGrnService {
    private final ReceivablesPayablesService receivablesPayablesService;
    private final SupplierBillRepository supplierBillRepository;

    public SupplierBillGrnService(ReceivablesPayablesService receivablesPayablesService,
                                  SupplierBillRepository supplierBillRepository) {
        this.receivablesPayablesService = receivablesPayablesService;
        this.supplierBillRepository = supplierBillRepository;
    }

    @Transactional
    public SupplierBill createFromGrn(GoodsReceivedNote grn, BigDecimal grnTotal) {
        UUID tenantId = requireTenant();
        UUID billId = receivablesPayablesService.createSupplierBill(new CreateSupplierBillRequest(
            grn.getSupplierName(),
            grnTotal,
            "RWF",
            LocalDate.now().plusDays(30)
        ));
        return supplierBillRepository.findByIdAndDeletedAtIsNull(billId)
            .filter(b -> tenantId.equals(b.getTenantId()))
            .orElseThrow(() -> new IllegalStateException("Supplier bill not created"));
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
