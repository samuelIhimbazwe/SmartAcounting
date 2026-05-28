package com.smartaccounting.repository;

import com.smartaccounting.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShiftRepository extends JpaRepository<Shift, UUID> {
    List<Shift> findByTenantIdOrderByShiftNameAsc(UUID tenantId);

    Optional<Shift> findByIdAndTenantId(UUID id, UUID tenantId);
}
