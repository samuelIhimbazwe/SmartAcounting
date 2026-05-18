package com.smartaccounting.dto;

public record OAuth2ProviderDto(
    String provider,
    String displayName,
    String loginUrl,
    String iconUrl
) {
    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String provider;
        private String displayName;
        private String loginUrl;
        private String iconUrl;

        public Builder provider(String provider) {
            this.provider = provider;
            return this;
        }

        public Builder displayName(String displayName) {
            this.displayName = displayName;
            return this;
        }

        public Builder loginUrl(String loginUrl) {
            this.loginUrl = loginUrl;
            return this;
        }

        public Builder iconUrl(String iconUrl) {
            this.iconUrl = iconUrl;
            return this;
        }

        public OAuth2ProviderDto build() {
            return new OAuth2ProviderDto(provider, displayName, loginUrl, iconUrl);
        }
    }
}
