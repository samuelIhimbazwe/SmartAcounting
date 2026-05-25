package com.smartaccounting.dto;

import java.util.UUID;

public record AssignedRoleSummary(
    UUID id,
    String name,
    boolean owner
) {}
