package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartaccounting.public-signup")
public class PublicSignupProperties {
    /**
     * E.164 phone for platform operations (new signup alerts, upgrade requests). Optional.
     */
    private String platformAdminPhone = "";

    private String loginUrlText = "smartaccounting.rw";

    public String getPlatformAdminPhone() {
        return platformAdminPhone;
    }

    public void setPlatformAdminPhone(String platformAdminPhone) {
        this.platformAdminPhone = platformAdminPhone == null ? "" : platformAdminPhone.trim();
    }

    public String getLoginUrlText() {
        return loginUrlText;
    }

    public void setLoginUrlText(String loginUrlText) {
        this.loginUrlText = loginUrlText == null ? "smartaccounting.rw" : loginUrlText;
    }
}
