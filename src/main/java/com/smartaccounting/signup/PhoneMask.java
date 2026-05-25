package com.smartaccounting.signup;

public final class PhoneMask {
    private PhoneMask() {
    }

    /** Masks all but the last 2 digits, e.g. +250 7XX XXX XX42 */
    public static String mask(String normalizedPhone) {
        if (normalizedPhone == null || normalizedPhone.isBlank()) {
            return "";
        }
        String phone = normalizedPhone.trim();
        if (phone.length() <= 4) {
            return phone;
        }
        String lastTwo = phone.substring(phone.length() - 2);
        if (phone.startsWith("+250") && phone.length() >= 12) {
            return "+250 7XX XXX XX" + lastTwo;
        }
        int visiblePrefix = Math.min(4, phone.length() - 2);
        return phone.substring(0, visiblePrefix) + " *** *** **" + lastTwo;
    }
}
