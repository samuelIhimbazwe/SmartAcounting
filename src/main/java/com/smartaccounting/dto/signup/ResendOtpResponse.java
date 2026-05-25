package com.smartaccounting.dto.signup;

public record ResendOtpResponse(
    String maskedPhone,
    String smsDelivery,
    String smsCarrier,
    String devOtp
) {
}
