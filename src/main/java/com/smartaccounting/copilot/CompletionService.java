package com.smartaccounting.copilot;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Shared single-turn Anthropic Messages completion (non-streaming) for copilot what-if, briefings, and similar.
 */
@Service
public class CompletionService {

    public static final String PLACEHOLDER_MESSAGE =
        "AI provider not configured. Set ANTHROPIC_API_KEY in production.";

    private final RestClient restClient = RestClient.create();
    private final String completionProvider;
    private final String completionModel;
    private final String anthropicApiKey;
    private final int completionMaxTokens;

    public CompletionService(
        @Value("${smartaccounting.ai.completion.provider:anthropic}") String completionProvider,
        @Value("${smartaccounting.ai.completion.model:claude-sonnet-4-20250514}") String completionModel,
        @Value("${smartaccounting.ai.completion.api-key:}") String anthropicApiKey,
        @Value("${smartaccounting.ai.completion.max-tokens:1000}") int completionMaxTokens
    ) {
        this.completionProvider = completionProvider;
        this.completionModel = completionModel;
        this.anthropicApiKey = anthropicApiKey;
        this.completionMaxTokens = completionMaxTokens;
    }

    public String complete(String userPrompt) {
        return complete(null, userPrompt);
    }

    /**
     * Single-turn completion. With {@code placeholder} provider or missing API key, returns a fixed dev message.
     */
    public String complete(String systemPrompt, String userPrompt) {
        return completeAnthropic(systemPrompt, userPrompt).orElse(PLACEHOLDER_MESSAGE);
    }

    /**
     * Anthropic path only — empty when placeholder / missing key / HTTP failure (caller supplies fallback).
     */
    public Optional<String> completeAnthropic(String systemPrompt, String userPrompt) {
        if ("placeholder".equalsIgnoreCase(completionProvider)) {
            return Optional.empty();
        }
        if (!"anthropic".equalsIgnoreCase(completionProvider) || !StringUtils.hasText(anthropicApiKey)) {
            return Optional.empty();
        }
        LinkedHashMap<String, Object> request = new LinkedHashMap<>();
        request.put("model", completionModel);
        request.put("max_tokens", completionMaxTokens);
        request.put("messages", List.of(Map.of("role", "user", "content", userPrompt)));
        if (StringUtils.hasText(systemPrompt)) {
            request.put("system", systemPrompt);
        }

        try {
            AnthropicResponse response = restClient.post()
                .uri("https://api.anthropic.com/v1/messages")
                .header("x-api-key", anthropicApiKey)
                .header("anthropic-version", "2023-06-01")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(AnthropicResponse.class);
            return extractFirstText(response);
        } catch (RuntimeException ex) {
            return Optional.empty();
        }
    }

    private Optional<String> extractFirstText(AnthropicResponse response) {
        if (response == null || response.content() == null || response.content().isEmpty()) {
            return Optional.empty();
        }
        for (ContentBlock block : response.content()) {
            if (block != null && "text".equals(block.type()) && StringUtils.hasText(block.text())) {
                return Optional.of(block.text());
            }
        }
        return Optional.empty();
    }

    private record AnthropicResponse(List<ContentBlock> content) {}

    private record ContentBlock(String type, String text) {}
}
