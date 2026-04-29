package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
public record ScenarioTemplateRequest(
    @NotBlank String role,
    @NotBlank String name,
    @NotNull Map<String, Object> assumptions
) {}
