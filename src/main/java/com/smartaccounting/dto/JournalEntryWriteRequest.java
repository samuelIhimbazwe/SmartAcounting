package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record JournalEntryWriteRequest(
    String referenceNumber,
    @NotNull LocalDate entryDate,
    @NotBlank String description,
    @NotEmpty List<@Valid JournalLineWrite> lines,
    @NotBlank String currencyCode,
    boolean post
) {}
