package com.smartchain.service;
import com.smartchain.dto.DeviceEventRequest;
import com.smartchain.dto.DomainEventRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class IotService {
    private final EventLogService eventLogService;
    public IotService(EventLogService eventLogService) { this.eventLogService = eventLogService; }
    @Transactional
    public UUID ingest(DeviceEventRequest req) {
        Map<String, Object> payload = new HashMap<>(req.payload());
        payload.put("deviceType", req.deviceType());
        payload.put("eventType", req.eventType());
        payload.put("occurredAt", Instant.now().toString());
        return eventLogService.append(new DomainEventRequest("IOT_DEVICE", UUID.randomUUID(), "IOT_EVENT_RECEIVED", payload));
    }
}
