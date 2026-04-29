package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record EnqueueActionRequest(
    @NotBlank String actionType,
    @NotBlank String actionRef,
    String payloadJson
) {}
