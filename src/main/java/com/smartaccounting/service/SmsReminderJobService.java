package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.entity.Invoice;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SmsReminderJobService {
    private final InvoiceRepository invoiceRepository;
    private final SmsDispatchService smsDispatchService;
    private final AuditService auditService;

    public SmsReminderJobService(InvoiceRepository invoiceRepository,
                                 SmsDispatchService smsDispatchService,
                                 AuditService auditService) {
        this.invoiceRepository = invoiceRepository;
        this.smsDispatchService = smsDispatchService;
        this.auditService = auditService;
    }

    @Transactional
    public Map<String, Object> run(LocalDate simulateDate) {
        UUID tenantId = requireTenant();
        LocalDate today = simulateDate == null ? LocalDate.now() : simulateDate;
        List<Invoice> openInvoices = invoiceRepository.findByTenantIdAndStatusIgnoreCaseAndDeletedAtIsNullOrderByDueDateAsc(tenantId, "OPEN");
        int remindersSent = 0;
        List<Map<String, Object>> triggered = new java.util.ArrayList<>();
        for (Invoice invoice : openInvoices) {
            if (invoice.getDueDate() == null || invoice.getCreatedAt() == null) {
                continue;
            }
            long daysUntilDue = ChronoUnit.DAYS.between(today, invoice.getDueDate());
            long originalTermDays = ChronoUnit.DAYS.between(
                invoice.getCreatedAt().atZone(java.time.ZoneOffset.UTC).toLocalDate(),
                invoice.getDueDate()
            );
            String stage = reminderStage(daysUntilDue, originalTermDays, normalizedReminderCount(invoice), invoice.getLastReminderSentDate(), today);
            if (stage == null) {
                continue;
            }

            String message = messageForStage(stage, invoice);
            UUID reminderEventId = UUID.nameUUIDFromBytes(
                ("invoice-reminder:" + invoice.getId() + ":" + stage + ":" + today).getBytes(java.nio.charset.StandardCharsets.UTF_8)
            );
            smsDispatchService.send(
                tenantId,
                reminderEventId,
                "INVOICE_DUE_REMINDER",
                List.of("+250000000000"),
                message
            );

            invoice.setReminderCount(normalizedReminderCount(invoice) + 1);
            invoice.setLastReminderSentDate(today);
            invoiceRepository.save(invoice);
            remindersSent++;
            triggered.add(Map.of(
                "invoiceId", invoice.getId().toString(),
                "reminderStage", stage,
                "message", message
            ));
        }

        auditService.logAction("SMS_REMINDER_JOB_RUN", "INVOICE", "{}", "{\"simulateDate\":\"" + today + "\",\"sent\":" + remindersSent + "}");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("simulateDate", today);
        out.put("openInvoicesScanned", openInvoices.size());
        out.put("remindersSent", remindersSent);
        out.put("triggered", triggered);
        return out;
    }

    private String reminderStage(long daysUntilDue,
                                 long originalTermDays,
                                 int reminderCount,
                                 LocalDate lastReminderSentDate,
                                 LocalDate today) {
        if (daysUntilDue < 0) {
            return null;
        }
        if (lastReminderSentDate != null && lastReminderSentDate.equals(today)) {
            return null;
        }
        boolean longTerm = originalTermDays >= 60;
        if (longTerm) {
            if (daysUntilDue == 30 && reminderCount == 0) return "advance";
            if (daysUntilDue == 7 && reminderCount == 1) return "week-before";
            if (daysUntilDue == 0 && reminderCount == 2) return "due-today";
            return null;
        }
        if (daysUntilDue == 7 && reminderCount == 0) return "week-before";
        if (daysUntilDue == 0 && reminderCount == 1) return "due-today";
        return null;
    }

    private String messageForStage(String stage, Invoice invoice) {
        return switch (stage) {
            case "advance" ->
                "Advance reminder: invoice " + invoice.getId() + " for " + invoice.getCustomerName()
                    + " is due in 30 days on " + invoice.getDueDate() + ".";
            case "week-before" ->
                "Week-before reminder: invoice " + invoice.getId() + " for " + invoice.getCustomerName()
                    + " is due in 7 days on " + invoice.getDueDate() + ".";
            case "due-today" ->
                "Due-today reminder: invoice " + invoice.getId() + " for " + invoice.getCustomerName()
                    + " is due today.";
            default -> throw new IllegalArgumentException("Unknown reminder stage");
        };
    }

    private int normalizedReminderCount(Invoice invoice) {
        return invoice.getReminderCount() == null ? 0 : Math.max(0, invoice.getReminderCount());
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
