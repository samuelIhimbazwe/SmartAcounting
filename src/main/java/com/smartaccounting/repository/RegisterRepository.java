package com.smartaccounting.repository;

import com.smartaccounting.entity.Register;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RegisterRepository extends JpaRepository<Register, UUID> {
    List<Register> findByTenantIdAndLocationIdAndActiveTrueOrderByName(
        UUID tenantId, UUID locationId);

    Optional<Register> findByIdAndTenantId(UUID id, UUID tenantId);
}
