package com.smartchain.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class NoOpDomainEventPublisher implements DomainEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(NoOpDomainEventPublisher.class);

    @Override
    public void publish(String topic, String eventType, Map<String, Object> payload) {
        log.info("Domain event publish (noop) topic={}, eventType={}, payloadKeys={}",
            topic, eventType, payload == null ? 0 : payload.keySet());
    }
}
