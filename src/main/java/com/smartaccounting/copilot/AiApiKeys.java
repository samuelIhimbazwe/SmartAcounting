package com.smartaccounting.copilot;

import org.springframework.util.StringUtils;

/**
 * Treats common placeholder values in {@code .env} as unset so dev falls back to stub copilot answers
 * instead of calling Anthropic with an invalid key.
 */
final class AiApiKeys {

    private AiApiKeys() {
    }

    static boolean isConfigured(String apiKey) {
        if (!StringUtils.hasText(apiKey)) {
            return false;
        }
        String normalized = apiKey.trim().toLowerCase();
        return !normalized.equals("your-real-key-here")
            && !normalized.equals("changeme")
            && !normalized.equals("replace-me")
            && !normalized.equals("placeholder")
            && !normalized.startsWith("sk-ant-placeholder");
    }
}
