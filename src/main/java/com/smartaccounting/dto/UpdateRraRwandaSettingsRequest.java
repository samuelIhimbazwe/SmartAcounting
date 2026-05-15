package com.smartaccounting.dto;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.Size;

public record UpdateRraRwandaSettingsRequest(
    @Nullable @Size(max = 32) String tin,
    @Nullable @Size(max = 255) String companyTradeName,
    @Nullable Boolean vatRegistered,
    @Nullable Boolean turnoverExceedsVatThreshold,
    @Nullable Boolean amountsTaxInclusive,
    @Nullable Boolean eisIntegrationEnabled,
    @Nullable @Size(max = 2000) String notes
) {
}
