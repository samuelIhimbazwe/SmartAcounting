package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.entity.Invoice;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SmsReminderJobServiceTest {
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private SmsDispatchService smsDispatchService;
    @Mock private AuditService auditService;

    private SmsReminderJobService service;
    private final UUID tenant = UUID.fromString("10000000-0000-0000-0000-000000000111");
    private final UUID user = UUID.fromString("20000000-0000-0000-0000-000000000222");

    @BeforeEach
    void setUp() {
        service = new SmsReminderJobService(invoiceRepository, smsDispatchService, auditService);
        TenantContext.set(tenant, user);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void triggerDaysSendCorrectStagesWithoutExtras() {
        LocalDate dueLong = LocalDate.of(2026, 6, 30);
        LocalDate dueShort = LocalDate.of(2026, 7, 20);
        Invoice longTerm = invoice("Long", dueLong.minusDays(60), dueLong);
        Invoice shortTerm = invoice("Short", dueShort.minusDays(45), dueShort);
        when(invoiceRepository.findByTenantIdAndStatusIgnoreCaseAndDeletedAtIsNullOrderByDueDateAsc(tenant, "OPEN"))
            .thenReturn(List.of(longTerm, shortTerm));

        Map<String, Object> r30 = service.run(dueLong.minusDays(30));
        assertThat(r30.get("remindersSent")).isEqualTo(1);
        assertThat(((List<Map<String, Object>>) r30.get("triggered")).get(0).get("reminderStage")).isEqualTo("advance");

        Map<String, Object> rNoDup = service.run(dueLong.minusDays(30));
        assertThat(rNoDup.get("remindersSent")).isEqualTo(0);

        Map<String, Object> rLong7 = service.run(dueLong.minusDays(7));
        assertThat(rLong7.get("remindersSent")).isEqualTo(1);
        assertThat(((List<Map<String, Object>>) rLong7.get("triggered")).get(0).get("reminderStage")).isEqualTo("week-before");

        Map<String, Object> rShort7 = service.run(dueShort.minusDays(7));
        assertThat(rShort7.get("remindersSent")).isEqualTo(1);
        assertThat(((List<Map<String, Object>>) rShort7.get("triggered")).get(0).get("reminderStage")).isEqualTo("week-before");

        Map<String, Object> rLong0 = service.run(dueLong);
        assertThat(rLong0.get("remindersSent")).isEqualTo(1);
        assertThat(((List<Map<String, Object>>) rLong0.get("triggered")).get(0).get("reminderStage")).isEqualTo("due-today");

        Map<String, Object> rShort0 = service.run(dueShort);
        assertThat(rShort0.get("remindersSent")).isEqualTo(1);
        assertThat(((List<Map<String, Object>>) rShort0.get("triggered")).get(0).get("reminderStage")).isEqualTo("due-today");

        Map<String, Object> rAfter = service.run(dueShort.plusDays(1));
        assertThat(rAfter.get("remindersSent")).isEqualTo(0);
        verify(invoiceRepository, org.mockito.Mockito.atLeast(4)).save(any(Invoice.class));
        verify(smsDispatchService, org.mockito.Mockito.atLeast(4))
            .send(eq(tenant), any(UUID.class), eq("INVOICE_DUE_REMINDER"), any(), any());
    }

    private Invoice invoice(String name, LocalDate createdDate, LocalDate dueDate) {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setTenantId(tenant);
        invoice.setCustomerName(name);
        invoice.setAmount(new BigDecimal("100.00"));
        invoice.setCurrencyCode("USD");
        invoice.setStatus("OPEN");
        invoice.setDueDate(dueDate);
        invoice.setCreatedAt(createdDate.atStartOfDay(ZoneOffset.UTC).toInstant());
        invoice.setReminderCount(0);
        invoice.setLastReminderSentDate(null);
        return invoice;
    }
}
