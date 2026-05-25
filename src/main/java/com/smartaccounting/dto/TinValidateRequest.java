package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

public record TinValidateRequest(@NotBlank String tin) {}
