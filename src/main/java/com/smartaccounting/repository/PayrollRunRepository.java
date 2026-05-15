package com.smartaccounting.repository;

import com.smartaccounting.entity.PayrollRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PayrollRunRepository extends JpaRepository<PayrollRun, UUID> {
    boolean existsByTenantIdAndPeriod(UUID tenantId, String period);
    Optional<PayrollRun> findByIdAndTenantId(UUID id, UUID tenantId);
    List<PayrollRun> findByTenantIdOrderByPeriodDesc(UUID tenantId);
    boolean existsByTenantIdAndPeriodAndStatusIn(UUID tenantId, String period, Collection<String> statuses);
}
