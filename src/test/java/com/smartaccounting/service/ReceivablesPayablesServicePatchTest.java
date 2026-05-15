package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.PatchFinanceCustomerRequest;
import com.smartaccounting.dto.PatchFinanceSupplierRequest;
import com.smartaccounting.dto.SupplierStatementLineRequest;
import com.smartaccounting.dto.SupplierStatementReconciliationRequest;
import com.smartaccounting.entity.FinanceCustomer;
import com.smartaccounting.entity.FinanceSupplier;
import com.smartaccounting.entity.Invoice;
import com.smartaccounting.entity.PaymentApplication;
import com.smartaccounting.entity.SupplierBill;
import com.smartaccounting.repository.FinanceCustomerRepository;
import com.smartaccounting.repository.FinanceSupplierRepository;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.repository.PaymentApplicationRepository;
import com.smartaccounting.repository.ReconciliationMatchItemRepository;
import com.smartaccounting.repository.SupplierBillRepository;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReceivablesPayablesServicePatchTest {
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private FinanceCustomerRepository financeCustomerRepository;
    @Mock private FinanceSupplierRepository financeSupplierRepository;
    @Mock private SupplierBillRepository supplierBillRepository;
    @Mock private PaymentApplicationRepository paymentApplicationRepository;
    @Mock private NotificationService notificationService;
    @Mock private AuditService auditService;
    @Mock private FinanceService financeService;
    @Mock private IdempotencyService idempotencyService;
    @Mock private ReconciliationMatchItemRepository reconciliationMatchItemRepository;
    @Mock private JdbcTemplate jdbcTemplate;

    private ReceivablesPayablesService service;
    private final UUID tenant = UUID.fromString("10000000-0000-0000-0000-000000000111");
    private final UUID user = UUID.fromString("20000000-0000-0000-0000-000000000222");

    @BeforeEach
    void setUp() {
        service = new ReceivablesPayablesService(
            invoiceRepository,
            financeCustomerRepository,
            financeSupplierRepository,
            supplierBillRepository,
            paymentApplicationRepository,
            notificationService,
            auditService,
            financeService,
            idempotencyService,
            reconciliationMatchItemRepository,
            jdbcTemplate
        );
        TenantContext.set(tenant, user);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void patchCustomerUpdatesCreditLimit() {
        UUID customerId = UUID.fromString("30000000-0000-0000-0000-000000000333");
        FinanceCustomer c = new FinanceCustomer();
        c.setId(customerId);
        c.setTenantId(tenant);
        c.setCustomerName("Acme");
        c.setCreditLimit(BigDecimal.ZERO);
        c.setBadDebtRiskScore(new BigDecimal("0.2500"));
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(Instant.now());
        when(financeCustomerRepository.findByIdAndTenantId(customerId, tenant)).thenReturn(Optional.of(c));
        when(invoiceRepository.findByTenantIdAndCustomerIdAndDeletedAtIsNullOrderByCreatedAtAsc(tenant, customerId))
            .thenReturn(java.util.List.of());

        service.patchCustomer(customerId, new PatchFinanceCustomerRequest(new BigDecimal("50000.00")));

        ArgumentCaptor<FinanceCustomer> captor = ArgumentCaptor.forClass(FinanceCustomer.class);
        verify(financeCustomerRepository).save(captor.capture());
        assertThat(captor.getValue().getCreditLimit()).isEqualByComparingTo("50000.00");
        verify(auditService).logAction(eq("FINANCE_CUSTOMER_UPDATED"), eq("FINANCE_CUSTOMER"), eq("{}"), any());
    }

    @Test
    void writeOffInvoiceBadDebtCreatesJournalArchivesAndReturnsResponse() {
        UUID invoiceId = UUID.fromString("50000000-0000-0000-0000-000000000555");
        UUID journalId = UUID.fromString("60000000-0000-0000-0000-000000000666");
        Invoice invoice = new Invoice();
        invoice.setId(invoiceId);
        invoice.setTenantId(tenant);
        invoice.setCustomerId(UUID.fromString("70000000-0000-0000-0000-000000000777"));
        invoice.setAmount(new BigDecimal("100.00"));
        invoice.setCurrencyCode("RWF");
        invoice.setStatus("OPEN");
        invoice.setDueDate(LocalDate.now().minusDays(45));
        invoice.setCreatedAt(Instant.now());

        PaymentApplication pa = new PaymentApplication();
        pa.setAppliedAmount(new BigDecimal("40.00"));

        when(idempotencyService.begin(eq(tenant), eq("finance.invoice.bad-debt"), eq("invoice-bad-debt:" + invoiceId), any()))
            .thenReturn(Optional.empty());
        when(invoiceRepository.findByIdAndDeletedAtIsNull(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentApplicationRepository.findByTenantIdAndTargetTypeAndTargetId(tenant, "INVOICE", invoiceId))
            .thenReturn(List.of(pa));
        when(financeService.createJournalEntry(any())).thenReturn(journalId);

        Map<String, Object> response = service.writeOffInvoiceBadDebt(invoiceId);

        assertThat(response.get("invoiceId")).isEqualTo(invoiceId);
        assertThat(response.get("journalEntryId")).isEqualTo(journalId);
        assertThat(response.get("status")).isEqualTo("BAD_DEBT");
        assertThat(response.get("archived")).isEqualTo(true);
        assertThat((BigDecimal) response.get("outstandingAmountWrittenOff")).isEqualByComparingTo("60.00");
        verify(invoiceRepository).save(any(Invoice.class));
        verify(idempotencyService).complete(eq(tenant), eq("finance.invoice.bad-debt"), eq("invoice-bad-debt:" + invoiceId), any());
    }

    @Test
    void writeOffInvoiceBadDebtReturnsIdempotentReplay() {
        UUID invoiceId = UUID.fromString("50000000-0000-0000-0000-000000000555");
        Map<String, Object> replay = Map.of(
            "invoiceId", invoiceId,
            "status", "BAD_DEBT"
        );
        when(idempotencyService.begin(eq(tenant), eq("finance.invoice.bad-debt"), eq("invoice-bad-debt:" + invoiceId), any()))
            .thenReturn(Optional.of(replay));

        Map<String, Object> response = service.writeOffInvoiceBadDebt(invoiceId);

        assertThat(response).isEqualTo(replay);
    }

    @Test
    void patchCustomerRequiresCreditLimit() {
        UUID customerId = UUID.randomUUID();
        assertThatThrownBy(() -> service.patchCustomer(customerId, new PatchFinanceCustomerRequest(null)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("creditLimit");
    }

    @Test
    void reconcileSupplierStatementReturnsBucketsAndCreatesUnmatchedEntries() {
        UUID supplierId = UUID.fromString("91000000-0000-0000-0000-000000000001");
        FinanceSupplier supplier = new FinanceSupplier();
        supplier.setId(supplierId);
        supplier.setTenantId(tenant);
        supplier.setSupplierName("Vendor");
        when(financeSupplierRepository.findByIdAndTenantId(supplierId, tenant)).thenReturn(Optional.of(supplier));

        SupplierBill matchedBill = new SupplierBill();
        matchedBill.setId(UUID.fromString("92000000-0000-0000-0000-000000000002"));
        matchedBill.setTenantId(tenant);
        matchedBill.setSupplierId(supplierId);
        matchedBill.setAmount(new BigDecimal("100.00"));
        SupplierBill systemOnlyBill = new SupplierBill();
        systemOnlyBill.setId(UUID.fromString("93000000-0000-0000-0000-000000000003"));
        systemOnlyBill.setTenantId(tenant);
        systemOnlyBill.setSupplierId(supplierId);
        systemOnlyBill.setAmount(new BigDecimal("50.00"));
        when(supplierBillRepository.findByTenantIdAndSupplierIdAndDeletedAtIsNullOrderByCreatedAtAsc(tenant, supplierId))
            .thenReturn(List.of(matchedBill, systemOnlyBill));
        when(reconciliationMatchItemRepository.existsByTenantIdAndItemTypeAndItemIdAndMatchedFalse(eq(tenant), any(), any()))
            .thenReturn(false);

        SupplierStatementReconciliationRequest request = new SupplierStatementReconciliationRequest(List.of(
            new SupplierStatementLineRequest(matchedBill.getId().toString(), new BigDecimal("100.00")),
            new SupplierStatementLineRequest("EXT-77", new BigDecimal("80.00"))
        ));

        Map<String, Object> out = service.reconcileSupplierStatement(supplierId, request);

        assertThat((List<?>) out.get("matched")).hasSize(1);
        assertThat((List<?>) out.get("systemOnly")).hasSize(1);
        assertThat((List<?>) out.get("statementOnly")).hasSize(1);
        assertThat((BigDecimal) out.get("balanceDifference")).isEqualByComparingTo("-30.00");
        verify(reconciliationMatchItemRepository, org.mockito.Mockito.times(2)).save(any());
    }

    @Test
    void patchSupplierUpdatesTermsAndLimit() {
        UUID supplierId = UUID.fromString("40000000-0000-0000-0000-000000000444");
        FinanceSupplier s = new FinanceSupplier();
        s.setId(supplierId);
        s.setTenantId(tenant);
        s.setSupplierName("Vendor");
        s.setCreditLimit(new BigDecimal("10000.00"));
        s.setPaymentTermsDays(30);
        s.setCreatedAt(Instant.now());
        s.setUpdatedAt(Instant.now());
        when(financeSupplierRepository.findByIdAndTenantId(supplierId, tenant)).thenReturn(Optional.of(s));
        when(supplierBillRepository.findByTenantIdAndSupplierIdAndDeletedAtIsNullOrderByCreatedAtAsc(tenant, supplierId))
            .thenReturn(java.util.List.of());

        service.patchSupplier(supplierId, new PatchFinanceSupplierRequest(new BigDecimal("25000.50"), 14));

        ArgumentCaptor<FinanceSupplier> captor = ArgumentCaptor.forClass(FinanceSupplier.class);
        verify(financeSupplierRepository).save(captor.capture());
        assertThat(captor.getValue().getCreditLimit()).isEqualByComparingTo("25000.50");
        assertThat(captor.getValue().getPaymentTermsDays()).isEqualTo(14);
    }

    @Test
    void patchSupplierRequiresAtLeastOneField() {
        UUID supplierId = UUID.randomUUID();
        assertThatThrownBy(() -> service.patchSupplier(supplierId, new PatchFinanceSupplierRequest(null, null)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("creditLimit");
    }
}
