package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.UUID;

@ConfigurationProperties(prefix = "smartaccounting.mobile-money")
public class MobileMoneyProperties {
    private String mtnWebhookSecret = "";
    private String airtelWebhookSecret = "";
    private String mtnAllowedIps = "";
    private UUID webhookActorUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");

    public String getMtnWebhookSecret() {
        return mtnWebhookSecret;
    }

    public void setMtnWebhookSecret(String mtnWebhookSecret) {
        this.mtnWebhookSecret = mtnWebhookSecret;
    }

    public String getAirtelWebhookSecret() {
        return airtelWebhookSecret;
    }

    public void setAirtelWebhookSecret(String airtelWebhookSecret) {
        this.airtelWebhookSecret = airtelWebhookSecret;
    }

    public String getMtnAllowedIps() {
        return mtnAllowedIps;
    }

    public void setMtnAllowedIps(String mtnAllowedIps) {
        this.mtnAllowedIps = mtnAllowedIps;
    }

    public UUID getWebhookActorUserId() {
        return webhookActorUserId;
    }

    public void setWebhookActorUserId(UUID webhookActorUserId) {
        this.webhookActorUserId = webhookActorUserId;
    }
}
