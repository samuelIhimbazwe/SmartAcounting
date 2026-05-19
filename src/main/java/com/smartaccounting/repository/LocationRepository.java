package com.smartaccounting.repository;

import com.smartaccounting.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LocationRepository extends JpaRepository<Location, UUID> {
    List<Location> findByTenantIdAndActiveTrueOrderByName(UUID tenantId);

    Optional<Location> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Location> findByTenantIdAndLocationCode(UUID tenantId, String locationCode);
}
