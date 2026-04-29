package com.smartchain.coprocess;

import java.util.List;
import java.util.Map;

public class RoleRetrievalPolicy {
    private static final Map<String, List<String>> ALLOWED = Map.of(
        "ceo", List.of("journal_entries", "stock_movements", "invoices", "payments", "purchase_orders", "sales_orders"),
        "cfo", List.of("journal_entries", "invoices", "payments", "purchase_orders"),
        "sales", List.of("invoices", "payments", "sales_orders"),
        "operations", List.of("stock_movements", "purchase_orders"),
        "hr", List.of("payroll", "headcount"),
        "marketing", List.of("campaigns", "attribution"),
        "accounting", List.of("journal_entries", "invoices", "payments", "reconciliations")
    );

    public static List<String> allowedEntityTypes(String role) {
        return ALLOWED.getOrDefault(role.toLowerCase(), List.of());
    }
}
