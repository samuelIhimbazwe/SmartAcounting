package com.smartaccounting.dto.signup;

import java.util.UUID;

public record SignupResponse(
    UUID tenantId,
    UUID userId,
    String token,
    String maskedPhone,
    /** SENT | DRY_RUN | DISABLED | FAILED */
    String smsDelivery,
    /** MTN | AIRTEL | UNKNOWN — detected from the phone number prefix. */
    String smsCarrier,
    /** Populated only in local/dev when SMS is not delivered to the handset. */
    String devOtp
) {
}
