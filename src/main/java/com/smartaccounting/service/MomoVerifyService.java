package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.config.MobileMoneyProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class MomoVerifyService {
    private static final Logger log = LoggerFactory.getLogger(MomoVerifyService.class);

    private final MobileMoneyProperties properties;
    private final ObjectMapper objectMapper;

    public MomoVerifyService(MobileMoneyProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> verify(String transactionCode, String provider, BigDecimal amount) {
        String code = transactionCode == null ? "" : transactionCode.trim();
        if (code.isBlank()) {
            return Map.of("status", "FAILED", "message", "Transaction code is required");
        }
        if (properties.isVerifyLiveEnabled()) {
            return verifyLive(code, provider, amount);
        }
        boolean looksValid = code.length() >= 8 && code.matches("[A-Za-z0-9-]+");
        return Map.of(
            "status", looksValid ? "CONFIRMED" : "FAILED",
            "transactionCode", code,
            "provider", provider,
            "amount", amount,
            "message",
            looksValid
                ? "Payment reference accepted (stub — set smartaccounting.mobile-money.verify-enabled=true for live verify)."
                : "Invalid transaction code format"
        );
    }

    private Map<String, Object> verifyLive(String code, String provider, BigDecimal amount) {
        String url = "MTN".equalsIgnoreCase(provider) || provider == null
            ? properties.getMtnVerifyUrl()
            : properties.getAirtelVerifyUrl();
        if (url == null || url.isBlank()) {
            return Map.of("status", "FAILED", "message", "Verify URL not configured for " + provider);
        }
        try {
            HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(properties.getVerifyConnectTimeoutMs());
            conn.setReadTimeout(properties.getVerifyReadTimeoutMs());
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            if (properties.getVerifyBearerToken() != null && !properties.getVerifyBearerToken().isBlank()) {
                conn.setRequestProperty("Authorization", "Bearer " + properties.getVerifyBearerToken());
            }
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("transactionCode", code);
            body.put("provider", provider);
            body.put("amount", amount);
            byte[] payload = objectMapper.writeValueAsBytes(body);
            conn.getOutputStream().write(payload);
            int status = conn.getResponseCode();
            InputStream stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
            String raw = stream == null ? "" : new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = raw.isBlank()
                ? Map.of()
                : objectMapper.readValue(raw, Map.class);
            boolean ok = status >= 200 && status < 300
                && ("CONFIRMED".equalsIgnoreCase(String.valueOf(parsed.get("status")))
                    || Boolean.TRUE.equals(parsed.get("confirmed")));
            return Map.of(
                "status", ok ? "CONFIRMED" : "FAILED",
                "transactionCode", code,
                "provider", provider,
                "amount", amount,
                "message", String.valueOf(parsed.getOrDefault("message", ok ? "Verified" : "Verification failed"))
            );
        } catch (Exception ex) {
            log.warn("MoMo live verify failed: {}", ex.getMessage());
            return Map.of(
                "status", "FAILED",
                "transactionCode", code,
                "message", "Operator verify error: " + ex.getMessage()
            );
        }
    }
}
