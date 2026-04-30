package com.smartchain.alerts;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseEventBroadcaster {
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter register(UUID tenantId, UUID userId, String role) {
        String key = key(tenantId, userId, role);
        SseEmitter emitter = new SseEmitter(0L);
        emitters.put(key, emitter);
        emitter.onCompletion(() -> emitters.remove(key));
        emitter.onTimeout(() -> emitters.remove(key));
        return emitter;
    }

    public void broadcastToRole(UUID tenantId, String role, String eventName, Object payload) {
        String roleNormalized = role.toLowerCase();
        emitters.forEach((k, emitter) -> {
            if (k.startsWith(tenantId + ":") && k.endsWith(":" + roleNormalized)) {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(payload));
                } catch (IOException ignored) {
                    emitter.complete();
                }
            }
        });
    }

    @Scheduled(fixedDelayString = "${smartchain.sse.heartbeat-ms:30000}")
    public void heartbeat() {
        emitters.forEach((k, emitter) -> {
            try {
                emitter.send(SseEmitter.event().comment("heartbeat"));
            } catch (IOException ignored) {
                emitter.complete();
            }
        });
    }

    private String key(UUID tenantId, UUID userId, String role) {
        return tenantId + ":" + userId + ":" + role.toLowerCase();
    }
}
