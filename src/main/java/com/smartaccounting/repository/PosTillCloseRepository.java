package com.smartaccounting.repository;

import com.smartaccounting.entity.PosTillClose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface PosTillCloseRepository extends JpaRepository<PosTillClose, UUID> {
    Optional<PosTillClose> findByTenantIdAndBusinessDateAndPosRegisterCode(UUID tenantId, LocalDate businessDate, String posRegisterCode);
}
