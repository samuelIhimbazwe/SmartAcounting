package com.smartchain.repository;

import com.smartchain.entity.WebhookDeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WebhookDeliveryLogRepository extends JpaRepository<WebhookDeliveryLog, UUID> {
}
