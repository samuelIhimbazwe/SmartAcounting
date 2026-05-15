package com.smartaccounting.dto.signup;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublicSignupRequest(
    @NotBlank String businessName,
    @NotBlank String ownerName,
    @Email @NotBlank String email,
    @NotBlank String phone,
    @NotBlank @Size(min = 8, max = 128) String password,
    @NotBlank String plan,
    String billingCycle
) {
    public PublicSignupRequest(String businessName, String ownerName, String email, String phone,
                               String password, String plan) {
        this(businessName, ownerName, email, phone, password, plan, null);
    }
}
