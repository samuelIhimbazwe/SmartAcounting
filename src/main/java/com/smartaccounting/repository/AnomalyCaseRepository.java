package com.smartaccounting.repository;

import com.smartaccounting.entity.AnomalyCase;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnomalyCaseRepository extends JpaRepository<AnomalyCase, UUID> {
    Optional<AnomalyCase> findByIdAndTenantId(UUID id, UUID tenantId);

    List<AnomalyCase> findTop20ByAffectedRoleAndStatusOrderByCreatedAtDesc(String affectedRole, String status);
    List<AnomalyCase> findByAffectedRoleAndStatusOrderByCreatedAtDesc(String affectedRole, String status, Pageable pageable);

    long countByTenantIdAndStatus(UUID tenantId, String status);

    @Query("select a from AnomalyCase a where a.tenantId = :tenantId and a.status in :statuses order by a.createdAt desc")
    List<AnomalyCase> findByTenantIdAndStatusInOrderByCreatedAtDesc(
        @Param("tenantId") UUID tenantId,
        @Param("statuses") Collection<String> statuses
    );

    @Query("select count(a) from AnomalyCase a where a.tenantId = :tenantId and a.status in :statuses and upper(a.severity) in :severities")
    long countByTenantIdAndStatusInAndSeverityIn(
        @Param("tenantId") UUID tenantId,
        @Param("statuses") Collection<String> statuses,
        @Param("severities") Collection<String> severities
    );

    @Query("select count(a) from AnomalyCase a where a.tenantId = :tenantId and a.status in :statuses and upper(a.severity) = :severity")
    long countByTenantIdAndStatusInAndSeverity(
        @Param("tenantId") UUID tenantId,
        @Param("statuses") Collection<String> statuses,
        @Param("severity") String severity
    );

    @Query("select a from AnomalyCase a where a.tenantId = :tenantId and upper(a.kpiName) = upper(:kpiName) and a.status in :statuses")
    List<AnomalyCase> findByTenantIdAndKpiNameAndStatusIn(
        @Param("tenantId") UUID tenantId,
        @Param("kpiName") String kpiName,
        @Param("statuses") Collection<String> statuses
    );
}
