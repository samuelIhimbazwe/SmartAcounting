package com.smartaccounting.repository;
import com.smartaccounting.entity.NotificationEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface NotificationEventRepository extends JpaRepository<NotificationEvent, UUID> {
    List<NotificationEvent> findTop100ByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<NotificationEvent> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
