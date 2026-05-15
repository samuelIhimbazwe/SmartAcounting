package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartaccounting.oauth")
public class OidcClientProperties {

    /**
     * Comma-separated Google OAuth client IDs (Web client) whose ID tokens this API will accept.
     */
    private String googleClientIds = "";

    /**
     * Comma-separated Microsoft Entra application (client) IDs whose ID tokens this API will accept.
     */
    private String microsoftClientIds = "";

    public String getGoogleClientIds() {
        return googleClientIds;
    }

    public void setGoogleClientIds(String googleClientIds) {
        this.googleClientIds = googleClientIds;
    }

    public String getMicrosoftClientIds() {
        return microsoftClientIds;
    }

    public void setMicrosoftClientIds(String microsoftClientIds) {
        this.microsoftClientIds = microsoftClientIds;
    }
}
