package com.smartaccounting.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Profile("prod")
public class ProdSecretsValidator implements ApplicationRunner {

    @Value("${smartaccounting.security.jwt-secret:${JWT_SECRET:}}")
    private String jwtSecret;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Value("${smartaccounting.cors.allowed-origins:}")
    private String allowedOrigins;

    @Value("${smartaccounting.ai.fail-on-missing-provider-keys:true}")
    private boolean failOnMissingAiKeys;

    @Value("${smartaccounting.ai.embedding.api-key:}")
    private String openAiKey;

    @Value("${smartaccounting.ai.completion.api-key:}")
    private String anthropicKey;

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(jwtSecret) || jwtSecret.length() < 64) {
            throw new IllegalStateException("Production requires JWT_SECRET with at least 64 characters.");
        }
        if (!StringUtils.hasText(dbPassword)) {
            throw new IllegalStateException("Production requires DB_PASSWORD.");
        }
        if (!StringUtils.hasText(allowedOrigins) || allowedOrigins.contains("*")) {
            throw new IllegalStateException("Production requires CORS_ALLOWED_ORIGINS as explicit comma-separated origins (no wildcard).");
        }
        if (failOnMissingAiKeys) {
            if (!StringUtils.hasText(openAiKey)) {
                throw new IllegalStateException("Production requires OPENAI_API_KEY or SMARTACCOUNTING_AI_FAIL_ON_MISSING_PROVIDER_KEYS=false.");
            }
            if (!StringUtils.hasText(anthropicKey)) {
                throw new IllegalStateException("Production requires ANTHROPIC_API_KEY or SMARTACCOUNTING_AI_FAIL_ON_MISSING_PROVIDER_KEYS=false.");
            }
        }
    }
}
