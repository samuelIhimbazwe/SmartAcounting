package com.smartaccounting.repository;
import com.smartaccounting.entity.CloseTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface CloseTaskRepository extends JpaRepository<CloseTask, UUID> {
    List<CloseTask> findByTenantIdAndPeriodOrderByCreatedAtAsc(UUID tenantId, String period);

    Optional<CloseTask> findByTenantIdAndPeriodAndTaskKey(UUID tenantId, String period, String taskKey);

    long countByTenantIdAndCompletedAtIsNull(UUID tenantId);
}
