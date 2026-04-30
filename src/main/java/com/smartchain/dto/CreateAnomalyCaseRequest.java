package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
public record CreateAnomalyCaseRequest(
    @NotBlank String affectedRole,
    @NotBlank String severity,
    @NotBlank String title,
    @NotBlank String details
) {}
