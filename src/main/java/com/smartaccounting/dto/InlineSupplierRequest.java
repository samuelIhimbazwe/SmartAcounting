package com.smartaccounting.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record InlineSupplierRequest(
    @NotBlank String name,
    String phone,
    @JsonProperty("tin_number") String tinNumber
) {}
