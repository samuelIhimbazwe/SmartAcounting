package com.smartchain.events;

import com.smartchain.entity.OutboxEvent;
import com.smartchain.repository.OutboxEventRepository;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.MDC;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@ConditionalOnProperty(prefix = "smartchain.kafka", name = "enabled", havingValue = "true")
public class OutboxRelayService {
    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final int maxAttempts;

    public OutboxRelayService(OutboxEventRepository outboxEventRepository,
                              KafkaTemplate<String, String> kafkaTemplate,
                              @Value("${smartchain.outbox.max-attempts:8}") int maxAttempts) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.maxAttempts = maxAttempts;
    }

    @Scheduled(fixedDelayString = "${smartchain.outbox.relay-delay-ms:1500}")
    @Transactional
    public void relayPending() {
        Instant now = Instant.now();
        List<OutboxEvent> due = new ArrayList<>(outboxEventRepository.findTop100ByStatusAndNextAttemptAtBeforeOrderByCreatedAtAsc("PENDING", now));
        due.addAll(outboxEventRepository.findTop100ByStatusAndNextAttemptAtIsNullOrderByCreatedAtAsc("PENDING"));
        for (OutboxEvent event : due.stream().distinct().limit(100).toList()) {
            try {
                String key = event.getTenantId() != null ? event.getTenantId().toString() : event.getEventType();
                ProducerRecord<String, String> record = new ProducerRecord<>(event.getTopic(), key, event.getPayload());
                String correlationId = MDC.get("correlationId");
                if (correlationId == null || correlationId.isBlank()) {
                    correlationId = UUID.randomUUID().toString();
                }
                record.headers().add("X-Correlation-Id", correlationId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                if (event.getTenantId() != null) {
                    record.headers().add("X-Tenant-Id", event.getTenantId().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
                }
                kafkaTemplate.send(record);
                event.setStatus("PUBLISHED");
                event.setPublishedAt(now);
                event.setLastError(null);
            } catch (Exception e) {
                int nextAttempt = event.getAttemptCount() + 1;
                event.setAttemptCount(nextAttempt);
                event.setLastError(e.getMessage());
                if (nextAttempt >= maxAttempts) {
                    event.setStatus("FAILED");
                } else {
                    long backoff = Math.min(60000L, (long) Math.pow(2, nextAttempt) * 1000L);
                    event.setNextAttemptAt(now.plusMillis(backoff));
                }
            }
            outboxEventRepository.save(event);
        }
    }
}
