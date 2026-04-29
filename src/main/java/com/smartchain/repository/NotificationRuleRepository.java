package com.smartchain.repository;
import com.smartchain.entity.NotificationRule;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface NotificationRuleRepository extends JpaRepository<NotificationRule, UUID> {
    List<NotificationRule> findByEventTypeAndActiveTrue(String eventType);
    List<NotificationRule> findTop100ByActiveTrueOrderByCreatedAtDesc();
    List<NotificationRule> findByActiveTrueOrderByCreatedAtDesc(Pageable pageable);
}
