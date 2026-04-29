package com.smartchain.repository;

import com.smartchain.entity.ExportJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ExportJobRepository extends JpaRepository<ExportJob, UUID> {
    Optional<ExportJob> findByIdAndTenantId(UUID id, UUID tenantId);
}
