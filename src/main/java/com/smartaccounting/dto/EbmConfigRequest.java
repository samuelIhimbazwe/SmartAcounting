package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

public record EbmConfigRequest(
    @NotBlank String ebmTin,
    @NotBlank String ebmDeviceSerial,
    @NotBlank String ebmApiUrl,
    String ebmApiKey,
    Boolean isActive
) {}
