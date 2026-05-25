package com.smartaccounting.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class RolePermissionSuggestionService {

    public List<String> suggest(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return List.of();
        }
        String lower = roleName.trim().toLowerCase(Locale.ROOT);
        Set<String> codes = new LinkedHashSet<>();

        if (containsAny(lower, "cashier", "till", "pos")) {
            codes.addAll(List.of("POS_ACCESS", "POS_TILL_MANAGE", "EBM_SUBMIT"));
        }
        if (containsAny(lower, "manager", "supervisor", "lead")) {
            codes.addAll(List.of(
                "POS_ACCESS", "EBM_SUBMIT", "INVENTORY_READ", "FINANCE_READ",
                "HR_READ", "STAFF_INVITE", "ANALYTICS_OWN"
            ));
        }
        if (containsAny(lower, "stock", "inventory", "warehouse")) {
            codes.addAll(List.of("INVENTORY_READ", "INVENTORY_WRITE", "PROCUREMENT_READ"));
        }
        if (containsAny(lower, "finance", "accountant", "book")) {
            codes.addAll(List.of("FINANCE_READ", "FINANCE_WRITE", "REPORTS_EXPORT"));
        }
        if (containsAny(lower, "hr", "people", "staff")) {
            codes.addAll(List.of("HR_READ", "HR_WRITE", "STAFF_INVITE", "PAYROLL_READ"));
        }
        if (containsAny(lower, "market", "promo")) {
            codes.addAll(List.of("ANALYTICS_ALL", "REPORTS_EXPORT", "AI_COPILOT"));
        }
        if (containsAny(lower, "procure", "buyer", "purchase")) {
            codes.addAll(List.of("PROCUREMENT_READ", "PROCUREMENT_WRITE"));
        }
        if (codes.isEmpty()) {
            codes.addAll(List.of("INVENTORY_READ", "FINANCE_READ", "ANALYTICS_OWN"));
        }
        return new ArrayList<>(codes);
    }

    private static boolean containsAny(String haystack, String... needles) {
        for (String needle : needles) {
            if (haystack.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
