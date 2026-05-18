package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

public class PushTokenRequest {
    @NotBlank
    private String token;
    @NotBlank
    private String platform;
    private String appVersion;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getAppVersion() { return appVersion; }
    public void setAppVersion(String appVersion) { this.appVersion = appVersion; }
}
