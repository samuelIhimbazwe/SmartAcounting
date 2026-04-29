package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
public record CreateWebhookSubscriptionRequest(
    @NotBlank String callbackUrl,
    @NotBlank String eventType,
    @NotBlank String secret
) {}
