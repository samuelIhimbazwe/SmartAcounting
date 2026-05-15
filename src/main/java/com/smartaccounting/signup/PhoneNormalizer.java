package com.smartaccounting.signup;

import java.util.Locale;

public final class PhoneNormalizer {
    private PhoneNormalizer() {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw.trim();
        if (s.isEmpty()) {
            return "";
        }
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isDigit(c) || c == '+') {
                b.append(c);
            }
        }
        String compact = b.toString();
        if (compact.startsWith("+")) {
            return compact;
        }
        if (compact.startsWith("0") && compact.length() >= 9) {
            return "+250" + compact.substring(1);
        }
        return "+" + compact;
    }
}
