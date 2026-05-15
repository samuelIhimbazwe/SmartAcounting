package com.smartaccounting.repository;

import com.smartaccounting.entity.GrnLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GrnLineRepository extends JpaRepository<GrnLine, UUID> {
    List<GrnLine> findByGrnId(UUID grnId);
    List<GrnLine> findByTenantIdAndGrnId(UUID tenantId, UUID grnId);
}
