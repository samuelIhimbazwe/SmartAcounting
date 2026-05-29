package com.smartaccounting.dto;

public record ProcessActionRequest(
    String decision,
    String reason,
    String source,
    String actionType
) {}
