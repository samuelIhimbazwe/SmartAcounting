package com.smartaccounting.sms;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Detects Rwanda mobile network from E.164 numbers (+250…).
 * Prefix lists align with RURA allocations: MTN 78/79, Airtel 72/73.
 */
public final class RwandaMobileNetworkDetector {
    private static final List<String> DEFAULT_MTN_PREFIXES = List.of("78", "79");
    private static final List<String> DEFAULT_AIRTEL_PREFIXES = List.of("72", "73");

    private RwandaMobileNetworkDetector() {
    }

    public static RwandaMobileNetwork detect(String rawPhone) {
        return detect(rawPhone, DEFAULT_MTN_PREFIXES, DEFAULT_AIRTEL_PREFIXES);
    }

    public static RwandaMobileNetwork detect(
        String rawPhone,
        List<String> mtnPrefixes,
        List<String> airtelPrefixes
    ) {
        String national = nationalSignificantDigits(rawPhone);
        if (national == null || national.length() != 9) {
            return RwandaMobileNetwork.UNKNOWN;
        }
        String prefix2 = national.substring(0, 2);
        if (matchesPrefix(prefix2, mtnPrefixes)) {
            return RwandaMobileNetwork.MTN;
        }
        if (matchesPrefix(prefix2, airtelPrefixes)) {
            return RwandaMobileNetwork.AIRTEL;
        }
        return RwandaMobileNetwork.UNKNOWN;
    }

    public static List<String> parsePrefixConfig(String commaSeparated, List<String> defaults) {
        if (commaSeparated == null || commaSeparated.isBlank()) {
            return defaults;
        }
        return Arrays.stream(commaSeparated.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(s -> s.length() > 2 ? s.substring(0, 2) : s)
            .toList();
    }

    /** Returns 9-digit national number without leading 0, or null if not Rwanda mobile. */
    static String nationalSignificantDigits(String rawPhone) {
        if (rawPhone == null) {
            return null;
        }
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < rawPhone.length(); i++) {
            char c = rawPhone.charAt(i);
            if (Character.isDigit(c)) {
                digits.append(c);
            }
        }
        String compact = digits.toString();
        if (compact.startsWith("250") && compact.length() >= 12) {
            return compact.substring(3, 12);
        }
        if (compact.startsWith("0") && compact.length() >= 10) {
            return compact.substring(1, 10);
        }
        if (compact.length() == 9) {
            return compact;
        }
        return null;
    }

    private static boolean matchesPrefix(String prefix2, List<String> allowed) {
        for (String p : allowed) {
            if (prefix2.equals(p)) {
                return true;
            }
        }
        return false;
    }

    public static String networkLabel(RwandaMobileNetwork network) {
        return switch (network) {
            case MTN -> "MTN";
            case AIRTEL -> "Airtel";
            case UNKNOWN -> "UNKNOWN";
        };
    }
}
