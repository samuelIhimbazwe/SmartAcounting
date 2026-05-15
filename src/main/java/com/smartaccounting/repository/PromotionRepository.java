package com.smartaccounting.repository;

import com.smartaccounting.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromotionRepository extends JpaRepository<Promotion, UUID> {
    List<Promotion> findByTenantIdAndStatusAndStartDateBeforeAndEndDateAfterAndDeletedAtIsNull(
        UUID tenantId, String status, Instant startBefore, Instant endAfter);

    Page<Promotion> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    Page<Promotion> findByTenantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(
        UUID tenantId, String status, Pageable pageable);

    Optional<Promotion> findByIdAndTenantIdAndDeletedAtIsNull(UUID id, UUID tenantId);

    List<Promotion> findByTenantIdAndStatusAndDeletedAtIsNullOrderByStartDateDesc(
        UUID tenantId, String status);

    @Modifying
    @Query("update Promotion p set p.usageCount = coalesce(p.usageCount, 0) + 1 where p.id = :id")
    void incrementUsageCount(@Param("id") UUID id);
}
