package com.smartchain.repository;

import com.smartchain.entity.ForecastJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ForecastJobRepository extends JpaRepository<ForecastJob, UUID> {
    List<ForecastJob> findTop25ByStatusOrderByCreatedAtAsc(String status);
    Optional<ForecastJob> findByIdAndTenantId(UUID id, UUID tenantId);
}
