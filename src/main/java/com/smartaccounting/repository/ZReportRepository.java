package com.smartaccounting.repository;

import com.smartaccounting.entity.ZReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ZReportRepository extends JpaRepository<ZReport, UUID> {
    List<ZReport> findByTenantIdAndTillSessionIdOrderByCreatedAtDesc(UUID tenantId, UUID tillSessionId);

    Optional<ZReport> findFirstByTenantIdAndTillSessionIdAndReportTypeOrderByCreatedAtDesc(
        UUID tenantId, UUID tillSessionId, String reportType);
}
