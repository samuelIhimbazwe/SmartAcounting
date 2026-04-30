package com.smartchain.repository;
import com.smartchain.entity.ActionQueueItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface ActionQueueItemRepository extends JpaRepository<ActionQueueItem, UUID> {
    List<ActionQueueItem> findTop100ByStatusOrderByCreatedAtAsc(String status);
    List<ActionQueueItem> findByStatusOrderByCreatedAtAsc(String status, Pageable pageable);
    List<ActionQueueItem> findTop100ByApprovalStatusOrderByCreatedAtAsc(String approvalStatus);
    Optional<ActionQueueItem> findByIdAndTenantId(UUID id, UUID tenantId);
}
