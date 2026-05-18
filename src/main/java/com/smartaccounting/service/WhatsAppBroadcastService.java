package com.smartaccounting.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class WhatsAppBroadcastService {
    private static final Logger log = LoggerFactory.getLogger(WhatsAppBroadcastService.class);

    public boolean send(UUID tenantId, String eventType, String phone, String message) {
        String to = phone == null ? "" : phone.trim();
        if (to.isEmpty()) {
            return false;
        }
        log.info("WhatsApp dry-run tenant={} eventType={} to={} message={}", tenantId, eventType, to, message);
        return true;
    }
}
