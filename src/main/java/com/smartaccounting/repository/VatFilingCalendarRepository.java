package com.smartaccounting.repository;

import com.smartaccounting.entity.VatFilingCalendar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VatFilingCalendarRepository extends JpaRepository<VatFilingCalendar, UUID> {
    Optional<VatFilingCalendar> findByTenantIdAndPeriod(UUID tenantId, String period);
}
