package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateHrEmployeeRequest(
    @NotBlank String fullName,
    @NotBlank String department,
    @NotBlank String title
) {
}
