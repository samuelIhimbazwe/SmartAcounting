package com.smartaccounting.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * When {@code smartaccounting.ai.fail-on-missing-provider-keys} is true (default under {@code prod} profile),
 * fails startup if configured AI providers require API keys that are blank — avoiding silent placeholder
 * embeddings / fallback copilot answers in production.
 */
@Component
@Order(0)
public class AiProviderKeysStartupCheck implements ApplicationRunner {

    @Value("${smartaccounting.ai.fail-on-missing-provider-keys:false}")
    private boolean failOnMissingProviderKeys;

    @Value("${smartaccounting.ai.embedding.provider:openai}")
    private String embeddingProvider;

    @Value("${smartaccounting.ai.embedding.api-key:}")
    private String embeddingApiKey;

    @Value("${smartaccounting.ai.completion.provider:anthropic}")
    private String completionProvider;

    @Value("${smartaccounting.ai.completion.api-key:}")
    private String completionApiKey;

    @Override
    public void run(ApplicationArguments args) {
        if (!failOnMissingProviderKeys) {
            return;
        }
        List<String> errors = new ArrayList<>();
        if ("openai".equalsIgnoreCase(embeddingProvider) && !StringUtils.hasText(embeddingApiKey)) {
            errors.add(
                "OPENAI_API_KEY is missing or empty (bound as smartaccounting.ai.embedding.api-key) "
                    + "while smartaccounting.ai.embedding.provider is openai. "
                    + "Embeddings would fall back to deterministic placeholders."
            );
        }
        if ("anthropic".equalsIgnoreCase(completionProvider) && !StringUtils.hasText(completionApiKey)) {
            errors.add(
                "ANTHROPIC_API_KEY is missing or empty (bound as smartaccounting.ai.completion.api-key) "
                    + "while smartaccounting.ai.completion.provider is anthropic. "
                    + "Copilot completion would fall back to non-LLM behavior."
            );
        }
        if (!errors.isEmpty()) {
            throw new IllegalStateException(String.join(System.lineSeparator(), errors));
        }
    }
}
