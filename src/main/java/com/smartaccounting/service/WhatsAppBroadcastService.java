package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.config.WhatsAppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class WhatsAppBroadcastService {
    private static final Logger log = LoggerFactory.getLogger(WhatsAppBroadcastService.class);

    private final WhatsAppProperties properties;
    private final ObjectMapper objectMapper;

    public WhatsAppBroadcastService(WhatsAppProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public boolean send(UUID tenantId, String eventType, String phone, String message) {
        String to = phone == null ? "" : phone.trim();
        if (to.isEmpty()) {
            return false;
        }
        if (!properties.isEnabled()) {
            return false;
        }
        if (properties.isDryRun() || !properties.isLiveConfigured()) {
            log.info("WhatsApp dry-run tenant={} eventType={} to={} message={}", tenantId, eventType, to, message);
            return true;
        }
        return sendLive(to, message);
    }

    private boolean sendLive(String phone, String message) {
        try {
            String base = properties.getApiUrl().replaceAll("/+$", "");
            String url = base + "/" + properties.getPhoneNumberId() + "/messages";
            HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(properties.getConnectTimeoutMs());
            conn.setReadTimeout(properties.getReadTimeoutMs());
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + properties.getBearerToken());

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("to", phone.replaceAll("\\s+", ""));
            body.put("type", "text");
            body.put("text", Map.of("body", message));

            byte[] payload = objectMapper.writeValueAsBytes(body);
            try (OutputStream out = conn.getOutputStream()) {
                out.write(payload);
            }
            int status = conn.getResponseCode();
            if (status >= 200 && status < 300) {
                return true;
            }
            InputStream err = conn.getErrorStream();
            String raw = err == null ? "" : new String(err.readAllBytes(), StandardCharsets.UTF_8);
            log.warn("WhatsApp API error status={} body={}", status, raw);
            return false;
        } catch (Exception ex) {
            log.warn("WhatsApp send failed: {}", ex.getMessage());
            return false;
        }
    }
}
