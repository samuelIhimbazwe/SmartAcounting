package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartaccounting.public-signup")
public class PublicSignupProperties {
    /**
     * E.164 phone for platform operations (new signup alerts, upgrade requests). Optional.
     */
    private String platformAdminPhone = "";

    private String loginUrlText = "smartaccounting.rw";

    /** When false, signup IP rate limits are skipped (intended for local dev). */
    private boolean rateLimitEnabled = true;

    /** HTTP filter limit: POST /api/v1/public/signup per client IP per hour. */
    private int filterMaxPerHour = 3;

    /** Service-layer limit per client IP per hour (runs after the filter). */
    private int serviceMaxPerHour = 5;

    /**
     * When true and SMS is dry-run/disabled, the API returns the OTP in signup/resend responses
     * so local testers can complete verification without Redis or log tailing.
     */
    private boolean exposeOtpInResponse = false;

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

    public boolean isRateLimitEnabled() {
        return rateLimitEnabled;
    }

    public void setRateLimitEnabled(boolean rateLimitEnabled) {
        this.rateLimitEnabled = rateLimitEnabled;
    }

    public int getFilterMaxPerHour() {
        return filterMaxPerHour;
    }

    public void setFilterMaxPerHour(int filterMaxPerHour) {
        this.filterMaxPerHour = filterMaxPerHour;
    }

    public int getServiceMaxPerHour() {
        return serviceMaxPerHour;
    }

    public void setServiceMaxPerHour(int serviceMaxPerHour) {
        this.serviceMaxPerHour = serviceMaxPerHour;
    }

    public boolean isExposeOtpInResponse() {
        return exposeOtpInResponse;
    }

    public void setExposeOtpInResponse(boolean exposeOtpInResponse) {
        this.exposeOtpInResponse = exposeOtpInResponse;
    }
}
