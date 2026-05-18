package com.smartaccounting.service;

import com.smartaccounting.dto.ApplyPaymentRequest;
import com.smartaccounting.dto.CreatePaymentRequest;
import com.smartaccounting.dto.CreatePaymentRunRequest;
import com.smartaccounting.dto.PaymentRunDetail;
import com.smartaccounting.entity.PaymentRun;
import com.smartaccounting.entity.PaymentRunLine;
import com.smartaccounting.entity.PaymentApplication;
import com.smartaccounting.entity.SupplierBill;
import com.smartaccounting.repository.PaymentApplicationRepository;
import com.smartaccounting.repository.PaymentRunLineRepository;
import com.smartaccounting.repository.PaymentRunRepository;
import com.smartaccounting.repository.SupplierBillRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PaymentRunService {
    private final PaymentRunRepository paymentRunRepository;
    private final PaymentRunLineRepository paymentRunLineRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final PaymentApplicationRepository paymentApplicationRepository;
    private final AccountingOpsService accountingOpsService;
    private final PaymentApplicationService paymentApplicationService;

    public PaymentRunService(PaymentRunRepository paymentRunRepository,
                             PaymentRunLineRepository paymentRunLineRepository,
                             SupplierBillRepository supplierBillRepository,
                             PaymentApplicationRepository paymentApplicationRepository,
                             AccountingOpsService accountingOpsService,
                             PaymentApplicationService paymentApplicationService) {
        this.paymentRunRepository = paymentRunRepository;
        this.paymentRunLineRepository = paymentRunLineRepository;
        this.supplierBillRepository = supplierBillRepository;
        this.paymentApplicationRepository = paymentApplicationRepository;
        this.accountingOpsService = accountingOpsService;
        this.paymentApplicationService = paymentApplicationService;
    }

    public PaymentRun createPaymentRun(CreatePaymentRunRequest request, UUID createdBy) {
        UUID tenantId = requireTenant();
        String billStatus = request.billStatus() != null && !request.billStatus().isBlank()
            ? request.billStatus().toUpperCase() : "OPEN";

        List<SupplierBill> dueBills = supplierBillRepository
            .findByTenantIdAndStatusAndDueDateBetweenAndDeletedAtIsNull(
                tenantId, billStatus, request.fromDate(), request.toDate());

        PaymentRun run = new PaymentRun();
        run.setId(UUID.randomUUID());
        run.setTenantId(tenantId);
        run.setRunDate(LocalDate.now());
        run.setStatus("DRAFT");
        run.setTotalAmount(BigDecimal.ZERO);
        run.setPaymentCount(0);
        run.setCurrencyCode(request.currencyCode() != null ? request.currencyCode() : "RWF");
        run.setNotes(request.notes());
        run.setCreatedBy(createdBy);
        run.setCreatedAt(Instant.now());
        run = paymentRunRepository.save(run);

        BigDecimal total = BigDecimal.ZERO;
        int lineCount = 0;

        for (SupplierBill bill : dueBills) {
            BigDecimal applied = sumApplied(tenantId, bill.getId());
            BigDecimal outstanding = bill.getAmount().subtract(applied);
            if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            long daysOverdue = bill.getDueDate() != null
                ? Math.max(0, ChronoUnit.DAYS.between(bill.getDueDate(), LocalDate.now()))
                : 0;

            PaymentRunLine line = new PaymentRunLine();
            line.setId(UUID.randomUUID());
            line.setTenantId(tenantId);
            line.setPaymentRunId(run.getId());
            line.setSupplierBillId(bill.getId());
            line.setSupplierId(bill.getSupplierId());
            line.setSupplierName(bill.getSupplierName());
            line.setInvoiceReference(bill.getId().toString().substring(0, 8));
            line.setInvoiceAmount(bill.getAmount());
            line.setOutstandingAmount(outstanding);
            line.setPaymentAmount(outstanding);
            line.setDueDate(bill.getDueDate());
            line.setDaysOverdue((int) daysOverdue);
            line.setStatus("PENDING");
            line.setCreatedAt(Instant.now());
            paymentRunLineRepository.save(line);

            total = total.add(outstanding);
            lineCount++;
        }

        run.setTotalAmount(total);
        run.setPaymentCount(lineCount);
        return paymentRunRepository.save(run);
    }

    public PaymentRun approvePaymentRun(UUID runId, UUID approvedBy) {
        PaymentRun run = getRun(runId);
        if (!"DRAFT".equals(run.getStatus())) {
            throw new IllegalArgumentException("Only draft payment runs can be approved");
        }
        run.setStatus("APPROVED");
        run.setApprovedBy(approvedBy);
        run.setApprovedAt(Instant.now());
        return paymentRunRepository.save(run);
    }

    public PaymentRun executePaymentRun(UUID runId) {
        PaymentRun run = getRun(runId);
        if (!"APPROVED".equals(run.getStatus())) {
            throw new IllegalArgumentException("Payment run must be approved before execution");
        }

        List<PaymentRunLine> lines = paymentRunLineRepository.findByPaymentRunIdAndStatus(runId, "PENDING");
        for (PaymentRunLine line : lines) {
            try {
                UUID paymentId = accountingOpsService.createPayment(new CreatePaymentRequest(
                    "OUT",
                    line.getSupplierName(),
                    line.getPaymentAmount(),
                    run.getCurrencyCode()
                ));
                paymentApplicationService.apply(new ApplyPaymentRequest(
                    paymentId,
                    "SUPPLIER_BILL",
                    line.getSupplierBillId(),
                    line.getPaymentAmount()
                ));
                line.setStatus("PAID");
            } catch (Exception ex) {
                line.setStatus("FAILED");
            }
            paymentRunLineRepository.save(line);
        }

        run.setStatus("EXECUTED");
        run.setExecutedAt(Instant.now());
        return paymentRunRepository.save(run);
    }

    @Transactional(readOnly = true)
    public List<PaymentRun> listRuns() {
        return paymentRunRepository.findByTenantIdOrderByCreatedAtDesc(requireTenant());
    }

    @Transactional(readOnly = true)
    public PaymentRunDetail getRunDetail(UUID runId) {
        PaymentRun run = getRun(runId);
        List<PaymentRunLine> lines = paymentRunLineRepository.findByPaymentRunIdAndTenantId(runId, run.getTenantId());
        return new PaymentRunDetail(run, lines);
    }

    private PaymentRun getRun(UUID runId) {
        return paymentRunRepository.findByIdAndTenantId(runId, requireTenant())
            .orElseThrow(() -> new IllegalArgumentException("Payment run not found"));
    }

    private BigDecimal sumApplied(UUID tenantId, UUID billId) {
        return paymentApplicationRepository.findByTenantIdAndTargetTypeAndTargetId(
                tenantId, "SUPPLIER_BILL", billId).stream()
            .map(PaymentApplication::getAppliedAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
