package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateDocumentRequest(
    @NotBlank String entityType,
    @NotNull UUID entityId,
    @NotBlank String fileName,
    @NotBlank String contentType
) {
}
