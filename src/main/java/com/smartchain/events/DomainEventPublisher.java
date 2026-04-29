package com.smartchain.events;

import java.util.Map;

public interface DomainEventPublisher {
    void publish(String topic, String eventType, Map<String, Object> payload);
}
