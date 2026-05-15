package com.smartaccounting.repository;

import com.smartaccounting.entity.ShrinkageRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ShrinkageRecordRepository extends JpaRepository<ShrinkageRecord, UUID> {
    List<ShrinkageRecord> findByTenantIdAndIncidentDateBetween(UUID tenantId, LocalDate from, LocalDate to);
    Page<ShrinkageRecord> findByTenantIdAndIncidentDateBetweenOrderByCreatedAtDesc(
        UUID tenantId, LocalDate from, LocalDate to, Pageable pageable);
}
