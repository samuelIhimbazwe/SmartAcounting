package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartaccounting.whatsapp")
public class WhatsAppProperties {
    private boolean enabled = false;
    private boolean dryRun = true;
    /** WhatsApp Business API messages endpoint (Graph API). */
    private String apiUrl = "";
    private String bearerToken = "";
    private String phoneNumberId = "";
    private String templateName = "pos_receipt";
    private int connectTimeoutMs = 10000;
    private int readTimeoutMs = 30000;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public boolean isDryRun() { return dryRun; }
    public void setDryRun(boolean dryRun) { this.dryRun = dryRun; }
    public String getApiUrl() { return apiUrl; }
    public void setApiUrl(String apiUrl) { this.apiUrl = apiUrl; }
    public String getBearerToken() { return bearerToken; }
    public void setBearerToken(String bearerToken) { this.bearerToken = bearerToken; }
    public String getPhoneNumberId() { return phoneNumberId; }
    public void setPhoneNumberId(String phoneNumberId) { this.phoneNumberId = phoneNumberId; }
    public String getTemplateName() { return templateName; }
    public void setTemplateName(String templateName) { this.templateName = templateName; }
    public int getConnectTimeoutMs() { return connectTimeoutMs; }
    public void setConnectTimeoutMs(int connectTimeoutMs) { this.connectTimeoutMs = connectTimeoutMs; }
    public int getReadTimeoutMs() { return readTimeoutMs; }
    public void setReadTimeoutMs(int readTimeoutMs) { this.readTimeoutMs = readTimeoutMs; }

    public boolean isLiveConfigured() {
        return enabled && !dryRun && bearerToken != null && !bearerToken.isBlank()
            && apiUrl != null && !apiUrl.isBlank() && phoneNumberId != null && !phoneNumberId.isBlank();
    }
}
