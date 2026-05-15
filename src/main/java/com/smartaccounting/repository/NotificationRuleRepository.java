package com.smartaccounting.repository;
import com.smartaccounting.entity.NotificationRule;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface NotificationRuleRepository extends JpaRepository<NotificationRule, UUID> {
    List<NotificationRule> findByTenantIdAndEventTypeAndActiveTrue(UUID tenantId, String eventType);
    List<NotificationRule> findTop100ByTenantIdAndActiveTrueOrderByCreatedAtDesc(UUID tenantId);
    List<NotificationRule> findByTenantIdAndActiveTrueOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
