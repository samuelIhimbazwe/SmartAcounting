package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

public record SuggestPermissionsRequest(@NotBlank String roleName) {}
