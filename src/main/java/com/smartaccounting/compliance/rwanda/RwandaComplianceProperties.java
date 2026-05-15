package com.smartaccounting.compliance.rwanda;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;

/**
 * RRA EIS + domestic tax defaults. Base URL, paths, and token environment variable name are
 * deployment-specific; obtain the current EIS technical spec from RRA/authorized integrator.
 */
@ConfigurationProperties(prefix = "smartaccounting.rra.rwanda")
public class RwandaComplianceProperties {
    /**
     * When false, EIS calls are skipped and a stub success payload is stored for local development.
     */
    private boolean enabled = false;
    private String baseUrl = "https://eis.api.rra.example.invalid";
    /** Path appended to baseUrl for JSON invoice submission (placeholder until RRA certifies your client). */
    private String eisSubmitPath = "/eis/v1/invoice";
    /** Placeholder path for periodic VAT return submission (distinct from per-invoice EIS). */
    private String vatReturnSubmitPath = "/eis/v1/vat-return";
    /** Process environment variable name that holds the bearer token for EIS. */
    private String apiTokenEnvironmentVariable = "RRA_EIS_API_TOKEN";
    /** Standard VAT rate (since 2013) – 18%. */
    private BigDecimal vatRatePercent = new BigDecimal("18");
    /** B2B rule of thumb: registration required when turnover exceeds 20,000,000 RWF p.a. (flag is manual in settings). */
    private BigDecimal vatMandatoryRegistrationTurnoverRwf = new BigDecimal("20000000");
    /** VAT return for month M is due on this calendar day of month M+1 (RRA: by the 15th). */
    private int vatReturnDueDayOfNextMonth = 15;
    private int connectTimeoutMs = 15000;
    private int readTimeoutMs = 60000;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getEisSubmitPath() { return eisSubmitPath; }
    public void setEisSubmitPath(String eisSubmitPath) { this.eisSubmitPath = eisSubmitPath; }
    public String getVatReturnSubmitPath() { return vatReturnSubmitPath; }
    public void setVatReturnSubmitPath(String vatReturnSubmitPath) { this.vatReturnSubmitPath = vatReturnSubmitPath; }
    public String getApiTokenEnvironmentVariable() { return apiTokenEnvironmentVariable; }
    public void setApiTokenEnvironmentVariable(String apiTokenEnvironmentVariable) { this.apiTokenEnvironmentVariable = apiTokenEnvironmentVariable; }
    public BigDecimal getVatRatePercent() { return vatRatePercent; }
    public void setVatRatePercent(BigDecimal vatRatePercent) { this.vatRatePercent = vatRatePercent; }
    public BigDecimal getVatMandatoryRegistrationTurnoverRwf() { return vatMandatoryRegistrationTurnoverRwf; }
    public void setVatMandatoryRegistrationTurnoverRwf(BigDecimal vatMandatoryRegistrationTurnoverRwf) { this.vatMandatoryRegistrationTurnoverRwf = vatMandatoryRegistrationTurnoverRwf; }
    public int getVatReturnDueDayOfNextMonth() { return vatReturnDueDayOfNextMonth; }
    public void setVatReturnDueDayOfNextMonth(int vatReturnDueDayOfNextMonth) { this.vatReturnDueDayOfNextMonth = vatReturnDueDayOfNextMonth; }
    public int getConnectTimeoutMs() { return connectTimeoutMs; }
    public void setConnectTimeoutMs(int connectTimeoutMs) { this.connectTimeoutMs = connectTimeoutMs; }
    public int getReadTimeoutMs() { return readTimeoutMs; }
    public void setReadTimeoutMs(int readTimeoutMs) { this.readTimeoutMs = readTimeoutMs; }
}
