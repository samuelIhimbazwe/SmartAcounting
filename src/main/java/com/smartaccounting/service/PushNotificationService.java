package com.smartaccounting.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.ApnsConfig;
import com.google.firebase.messaging.Aps;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import com.smartaccounting.entity.DevicePushToken;
import com.smartaccounting.repository.DevicePushTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class PushNotificationService {
    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);

    private final DevicePushTokenRepository pushTokenRepository;

    @Value("${smartchain.fcm.service-account-path:}")
    private String serviceAccountPath;

    private FirebaseApp firebaseApp;

    public PushNotificationService(DevicePushTokenRepository pushTokenRepository) {
        this.pushTokenRepository = pushTokenRepository;
    }

    @PostConstruct
    public void init() {
        if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
            log.warn("FCM service account not configured. Push notifications disabled.");
            return;
        }
        try (FileInputStream serviceAccount = new FileInputStream(serviceAccountPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();
            if (FirebaseApp.getApps().isEmpty()) {
                firebaseApp = FirebaseApp.initializeApp(options);
            } else {
                firebaseApp = FirebaseApp.getInstance();
            }
        } catch (Exception e) {
            log.error("FCM init failed", e);
        }
    }

    @Transactional
    public void registerToken(UUID tenantId, UUID userId, String token, String platform, String appVersion) {
        String plat = platform == null ? "ANDROID" : platform.trim().toUpperCase(Locale.ROOT);
        DevicePushToken row = pushTokenRepository
            .findByTenantIdAndUserIdAndPlatform(tenantId, userId, plat)
            .orElseGet(() -> {
                DevicePushToken t = new DevicePushToken();
                t.setId(UUID.randomUUID());
                t.setTenantId(tenantId);
                t.setUserId(userId);
                t.setPlatform(plat);
                t.setCreatedAt(java.time.Instant.now());
                return t;
            });
        row.setToken(token);
        row.setAppVersion(appVersion);
        row.setActive(true);
        row.setLastUsedAt(java.time.Instant.now());
        row.setUpdatedAt(java.time.Instant.now());
        pushTokenRepository.save(row);
    }

    public void sendToUser(String tenantId, String userId, String title, String body, Map<String, String> data) {
        if (firebaseApp == null) {
            return;
        }
        List<DevicePushToken> tokens = pushTokenRepository.findByTenantIdAndUserIdAndIsActive(
            UUID.fromString(tenantId), UUID.fromString(userId), true);
        for (DevicePushToken deviceToken : tokens) {
            sendToToken(deviceToken.getToken(), title, body, data);
        }
    }

    public void sendToRole(String tenantId, String role, String title, String body, Map<String, String> data) {
        if (firebaseApp == null) {
            return;
        }
        String dbRole = mapAuthorityRoleToDbRole(role);
        List<DevicePushToken> tokens = pushTokenRepository.findActiveByTenantIdAndUserRole(
            UUID.fromString(tenantId), dbRole);
        for (DevicePushToken token : tokens) {
            sendToToken(token.getToken(), title, body, data);
        }
    }

    private void sendToToken(String token, String title, String body, Map<String, String> data) {
        try {
            Message message = Message.builder()
                .setToken(token)
                .setNotification(Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build())
                .putAllData(data != null ? data : Map.of())
                .setAndroidConfig(AndroidConfig.builder()
                    .setPriority(AndroidConfig.Priority.HIGH)
                    .build())
                .setApnsConfig(ApnsConfig.builder()
                    .setAps(Aps.builder()
                        .setSound("default")
                        .build())
                    .build())
                .build();

            FirebaseMessaging.getInstance(firebaseApp).send(message);
        } catch (FirebaseMessagingException e) {
            if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                deactivateToken(token);
            }
            log.warn("FCM send failed for token: {}", e.getMessage());
        }
    }

    @Transactional
    protected void deactivateToken(String token) {
        pushTokenRepository.deactivateByToken(token);
    }

    static String mapAuthorityRoleToDbRole(String role) {
        if (role == null) {
            return "ACCOUNTING";
        }
        String r = role.trim().toUpperCase(Locale.ROOT);
        if (r.startsWith("ROLE_")) {
            r = r.substring(5);
        }
        return switch (r) {
            case "CEO" -> "CEO";
            case "CFO" -> "CFO";
            case "SALES_MANAGER", "SALES" -> "SALES";
            case "OPS_MANAGER", "OPERATIONS" -> "OPERATIONS";
            case "HR_MANAGER", "HR" -> "HR";
            case "MARKETING_MANAGER", "MARKETING" -> "MARKETING";
            case "ACCOUNTING_CONTROLLER", "ACCOUNTING" -> "ACCOUNTING";
            default -> r;
        };
    }
}
