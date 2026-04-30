package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
public record CreateCloseTaskRequest(
    @NotBlank String period,
    @NotBlank String taskKey,
    @NotBlank String ownerRole,
    @NotNull List<String> dependsOn,
    @NotNull BigDecimal riskScore
) {}
