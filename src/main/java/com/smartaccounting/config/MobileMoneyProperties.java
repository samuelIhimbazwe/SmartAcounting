package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.UUID;

@ConfigurationProperties(prefix = "smartaccounting.mobile-money")
public class MobileMoneyProperties {
    private String mtnWebhookSecret = "";
    private String airtelWebhookSecret = "";
    private String mtnAllowedIps = "";
    private UUID webhookActorUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
    /** When true and verify URLs are set, USSD/reference verify calls operator HTTP APIs. */
    private boolean verifyEnabled = false;
    private String mtnVerifyUrl = "";
    private String airtelVerifyUrl = "";
    private String verifyBearerToken = "";
    private int verifyConnectTimeoutMs = 10000;
    private int verifyReadTimeoutMs = 30000;

    /** MTN MoMo Collections STK (request-to-pay). */
    private boolean stkEnabled = false;
    private String stkBaseUrl = "";
    private String stkSubscriptionKey = "";
    private String stkApiUser = "";
    private String stkApiKey = "";
    private String stkTargetEnvironment = "sandbox";
    private String stkCallbackUrl = "";

    public boolean isVerifyLiveEnabled() {
        return verifyEnabled
            && verifyBearerToken != null
            && !verifyBearerToken.isBlank()
            && ((mtnVerifyUrl != null && !mtnVerifyUrl.isBlank())
                || (airtelVerifyUrl != null && !airtelVerifyUrl.isBlank()));
    }

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

    public boolean isVerifyEnabled() { return verifyEnabled; }
    public void setVerifyEnabled(boolean verifyEnabled) { this.verifyEnabled = verifyEnabled; }
    public String getMtnVerifyUrl() { return mtnVerifyUrl; }
    public void setMtnVerifyUrl(String mtnVerifyUrl) { this.mtnVerifyUrl = mtnVerifyUrl; }
    public String getAirtelVerifyUrl() { return airtelVerifyUrl; }
    public void setAirtelVerifyUrl(String airtelVerifyUrl) { this.airtelVerifyUrl = airtelVerifyUrl; }
    public String getVerifyBearerToken() { return verifyBearerToken; }
    public void setVerifyBearerToken(String verifyBearerToken) { this.verifyBearerToken = verifyBearerToken; }
    public int getVerifyConnectTimeoutMs() { return verifyConnectTimeoutMs; }
    public void setVerifyConnectTimeoutMs(int verifyConnectTimeoutMs) { this.verifyConnectTimeoutMs = verifyConnectTimeoutMs; }
    public int getVerifyReadTimeoutMs() { return verifyReadTimeoutMs; }
    public void setVerifyReadTimeoutMs(int verifyReadTimeoutMs) { this.verifyReadTimeoutMs = verifyReadTimeoutMs; }

    public boolean isStkLiveEnabled() {
        return stkEnabled
            && stkBaseUrl != null && !stkBaseUrl.isBlank()
            && stkSubscriptionKey != null && !stkSubscriptionKey.isBlank()
            && stkApiUser != null && !stkApiUser.isBlank()
            && stkApiKey != null && !stkApiKey.isBlank();
    }

    public boolean isStkEnabled() { return stkEnabled; }
    public void setStkEnabled(boolean stkEnabled) { this.stkEnabled = stkEnabled; }
    public String getStkBaseUrl() { return stkBaseUrl; }
    public void setStkBaseUrl(String stkBaseUrl) { this.stkBaseUrl = stkBaseUrl; }
    public String getStkSubscriptionKey() { return stkSubscriptionKey; }
    public void setStkSubscriptionKey(String stkSubscriptionKey) { this.stkSubscriptionKey = stkSubscriptionKey; }
    public String getStkApiUser() { return stkApiUser; }
    public void setStkApiUser(String stkApiUser) { this.stkApiUser = stkApiUser; }
    public String getStkApiKey() { return stkApiKey; }
    public void setStkApiKey(String stkApiKey) { this.stkApiKey = stkApiKey; }
    public String getStkTargetEnvironment() { return stkTargetEnvironment; }
    public void setStkTargetEnvironment(String stkTargetEnvironment) { this.stkTargetEnvironment = stkTargetEnvironment; }
    public String getStkCallbackUrl() { return stkCallbackUrl; }
    public void setStkCallbackUrl(String stkCallbackUrl) { this.stkCallbackUrl = stkCallbackUrl; }
}
