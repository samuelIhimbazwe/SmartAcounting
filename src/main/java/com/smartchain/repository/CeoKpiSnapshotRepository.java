package com.smartchain.repository;

import com.smartchain.entity.CeoKpiSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface CeoKpiSnapshotRepository extends JpaRepository<CeoKpiSnapshot, CeoKpiSnapshot.Key> {
    Optional<CeoKpiSnapshot> findByTenantIdAndSnapshotDate(UUID tenantId, LocalDate snapshotDate);
}
