package com.smartaccounting.compliance;

import com.smartaccounting.entity.VatFilingCalendar;
import com.smartaccounting.repository.VatFilingCalendarRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class VatFilingCalendarService {

    private final VatFilingCalendarRepository repository;

    public VatFilingCalendarService(VatFilingCalendarRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> nextPeriods(int count) {
        UUID tenantId = requireTenant();
        List<Map<String, Object>> out = new ArrayList<>();
        YearMonth cursor = YearMonth.now();
        for (int i = 0; i < count; i++) {
            int quarter = ((cursor.getMonthValue() - 1) / 3) + 1;
            String period = cursor.getYear() + "-Q" + quarter;
            LocalDate due = quarterEnd(cursor.getYear(), quarter).plusMonths(1).withDayOfMonth(
                quarterEnd(cursor.getYear(), quarter).plusMonths(1).lengthOfMonth());
            Optional<VatFilingCalendar> row = repository.findByTenantIdAndPeriod(tenantId, period);
            out.add(Map.of(
                "period", period,
                "dueDate", due.toString(),
                "status", row.map(VatFilingCalendar::getStatus).orElse("PENDING"),
                "submittedAt", row.map(r -> String.valueOf(r.getSubmittedAt())).orElse(""),
                "referenceNumber", row.map(VatFilingCalendar::getReferenceNumber).orElse("")
            ));
            cursor = cursor.plusMonths(3);
        }
        return out;
    }

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void seedUpcomingPeriods() {
        // no-op placeholder: CFO notifications wired via workflow in future sprint
    }

    static LocalDate quarterEnd(int year, int quarter) {
        int month = quarter * 3;
        return LocalDate.of(year, month, 1).withDayOfMonth(LocalDate.of(year, month, 1).lengthOfMonth());
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
