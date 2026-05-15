package com.smartaccounting.repository;

import com.smartaccounting.entity.NotificationSmsDeliveryLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationSmsDeliveryLogRepository extends JpaRepository<NotificationSmsDeliveryLog, UUID> {
    List<NotificationSmsDeliveryLog> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
    List<NotificationSmsDeliveryLog> findByTenantIdAndNotificationEventIdOrderByCreatedAtDesc(UUID tenantId, UUID notificationEventId, Pageable pageable);
}
