package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "smartaccounting.sms")
public class SmsProperties {
    private boolean enabled = false;
    private boolean dryRun = true;
    /** Route +250 numbers to MTN or Airtel HTTP gateways by prefix. */
    private boolean routeByNetwork = true;
    private String mtnPrefixes = "78,79";
    private String airtelPrefixes = "72,73";

    /** Legacy single gateway when network is unknown or route-by-network is off. */
    private String providerUrl = "";
    private String bearerToken = "";
    private String senderId = "SMARTACCOUNTING";

    private CarrierGateway mtn = new CarrierGateway();
    private CarrierGateway airtel = new CarrierGateway();

    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 10000;

    public static class CarrierGateway {
        private String providerUrl = "";
        private String bearerToken = "";
        /** When blank, uses global sender-id. */
        private String senderId = "";

        public String getProviderUrl() {
            return providerUrl;
        }

        public void setProviderUrl(String providerUrl) {
            this.providerUrl = providerUrl == null ? "" : providerUrl.trim();
        }

        public String getBearerToken() {
            return bearerToken;
        }

        public void setBearerToken(String bearerToken) {
            this.bearerToken = bearerToken == null ? "" : bearerToken.trim();
        }

        public String getSenderId() {
            return senderId;
        }

        public void setSenderId(String senderId) {
            this.senderId = senderId == null ? "" : senderId.trim();
        }

        public boolean isConfigured() {
            return providerUrl != null && !providerUrl.isBlank();
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isDryRun() {
        return dryRun;
    }

    public void setDryRun(boolean dryRun) {
        this.dryRun = dryRun;
    }

    public boolean isRouteByNetwork() {
        return routeByNetwork;
    }

    public void setRouteByNetwork(boolean routeByNetwork) {
        this.routeByNetwork = routeByNetwork;
    }

    public String getMtnPrefixes() {
        return mtnPrefixes;
    }

    public void setMtnPrefixes(String mtnPrefixes) {
        this.mtnPrefixes = mtnPrefixes;
    }

    public String getAirtelPrefixes() {
        return airtelPrefixes;
    }

    public void setAirtelPrefixes(String airtelPrefixes) {
        this.airtelPrefixes = airtelPrefixes;
    }

    public String getProviderUrl() {
        return providerUrl;
    }

    public void setProviderUrl(String providerUrl) {
        this.providerUrl = providerUrl == null ? "" : providerUrl.trim();
    }

    public String getBearerToken() {
        return bearerToken;
    }

    public void setBearerToken(String bearerToken) {
        this.bearerToken = bearerToken == null ? "" : bearerToken.trim();
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId == null ? "" : senderId.trim();
    }

    public CarrierGateway getMtn() {
        return mtn;
    }

    public void setMtn(CarrierGateway mtn) {
        this.mtn = mtn == null ? new CarrierGateway() : mtn;
    }

    public CarrierGateway getAirtel() {
        return airtel;
    }

    public void setAirtel(CarrierGateway airtel) {
        this.airtel = airtel == null ? new CarrierGateway() : airtel;
    }

    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public int getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(int readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    public boolean isLegacyProviderConfigured() {
        return providerUrl != null && !providerUrl.isBlank();
    }

    public boolean isMtnGatewayConfigured() {
        return mtn != null && mtn.isConfigured();
    }

    public boolean isAirtelGatewayConfigured() {
        return airtel != null && airtel.isConfigured();
    }

    public boolean isCarrierRoutingConfigured() {
        return isMtnGatewayConfigured() || isAirtelGatewayConfigured();
    }

    /** Live HTTP send possible (any configured gateway, not dry-run). */
    public boolean isLiveDispatchConfigured() {
        return enabled && !dryRun && (isCarrierRoutingConfigured() || isLegacyProviderConfigured());
    }

    public List<String> resolvedMtnPrefixes() {
        return com.smartaccounting.sms.RwandaMobileNetworkDetector.parsePrefixConfig(
            mtnPrefixes,
            List.of("78", "79")
        );
    }

    public List<String> resolvedAirtelPrefixes() {
        return com.smartaccounting.sms.RwandaMobileNetworkDetector.parsePrefixConfig(
            airtelPrefixes,
            List.of("72", "73")
        );
    }
}
