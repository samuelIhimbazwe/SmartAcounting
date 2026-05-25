package com.smartaccounting.copilot;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CopilotActionPlannerService {
    private static final Pattern UUID_PATTERN = Pattern.compile("\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\\b");
    private static final Pattern DATE_PATTERN = Pattern.compile("\\b(\\d{4}-\\d{2}-\\d{2})\\b");
    private static final Pattern DECIMAL_PATTERN = Pattern.compile("(\\d+(?:\\.\\d{1,2})?)");
    private static final Pattern BARCODE_LINE_PATTERN = Pattern.compile("(?i)barcode\\s+([A-Za-z0-9-]+)(?:\\s+qty\\s+(\\d+(?:\\.\\d+)?))?");

    public Optional<CopilotActionPlan> plan(String role, String question, Map<String, Object> uiContext) {
        if (question == null || question.isBlank()) {
            return Optional.empty();
        }
        String normalized = question.toLowerCase(Locale.ROOT);
        return planInvoice(normalized, question)
            .or(() -> planSupplierBill(normalized, question))
            .or(() -> planReceiptReprint(normalized, question))
            .or(() -> planPosCheckout(normalized, question, uiContext))
            .or(() -> planPurchaseOrder(normalized, question))
            .or(() -> planReturn(normalized, question));
    }

    private Optional<CopilotActionPlan> planInvoice(String normalized, String question) {
        if (!normalized.contains("invoice")) {
            return Optional.empty();
        }
        String customer = extractNamedParty(question, "(?i)(?:invoice(?:\\s+for|\\s+to)?|customer)\\s+(.+?)(?=\\s+(?:amount|total|due|currency|on)\\b|$)");
        BigDecimal amount = extractAmount(question);
        String currency = extractCurrency(question).orElse("RWF");
        LocalDate dueDate = extractDate(question).orElse(null);

        List<String> missing = new ArrayList<>();
        if (customer == null) missing.add("customerName");
        if (amount == null) missing.add("amount");
        if (dueDate == null) missing.add("dueDate (YYYY-MM-DD)");

        Map<String, Object> payload = new LinkedHashMap<>();
        if (customer != null) payload.put("customerName", customer);
        if (amount != null) payload.put("amount", amount);
        payload.put("currencyCode", currency);
        if (dueDate != null) payload.put("dueDate", dueDate.toString());

        return Optional.of(new CopilotActionPlan(
            "CREATE_INVOICE",
            "FINANCE_WRITE",
            "Create invoice",
            customer != null
                ? "Create an invoice for %s%s.".formatted(customer, amount != null ? " amount " + amount + " " + currency : "")
                : "Draft a finance invoice from the prompt.",
            payload,
            missing.isEmpty(),
            missing,
            true,
            "Undo archives the created invoice. If it has already been shared or paid, review it before undoing.",
            "ARCHIVE_INVOICE"
        ));
    }

    private Optional<CopilotActionPlan> planSupplierBill(String normalized, String question) {
        if (!normalized.contains("supplier bill") && !normalized.contains("bill supplier")) {
            return Optional.empty();
        }
        String supplier = extractNamedParty(question, "(?i)(?:supplier\\s+bill(?:\\s+for)?|bill\\s+supplier)\\s+(.+?)(?=\\s+(?:amount|total|due|currency|on)\\b|$)");
        BigDecimal amount = extractAmount(question);
        String currency = extractCurrency(question).orElse("RWF");
        LocalDate dueDate = extractDate(question).orElse(null);

        List<String> missing = new ArrayList<>();
        if (supplier == null) missing.add("supplierName");
        if (amount == null) missing.add("amount");
        if (dueDate == null) missing.add("dueDate (YYYY-MM-DD)");

        Map<String, Object> payload = new LinkedHashMap<>();
        if (supplier != null) payload.put("supplierName", supplier);
        if (amount != null) payload.put("amount", amount);
        payload.put("currencyCode", currency);
        if (dueDate != null) payload.put("dueDate", dueDate.toString());

        return Optional.of(new CopilotActionPlan(
            "CREATE_SUPPLIER_BILL",
            "FINANCE_WRITE",
            "Create supplier bill",
            supplier != null
                ? "Create a supplier bill for %s%s.".formatted(supplier, amount != null ? " amount " + amount + " " + currency : "")
                : "Draft a supplier bill from the prompt.",
            payload,
            missing.isEmpty(),
            missing,
            true,
            "Undo archives the created supplier bill. If downstream payment work already started, review before undoing.",
            "ARCHIVE_SUPPLIER_BILL"
        ));
    }

    private Optional<CopilotActionPlan> planReceiptReprint(String normalized, String question) {
        if (!normalized.contains("reprint receipt") && !normalized.contains("print receipt")) {
            return Optional.empty();
        }
        UUID transactionId = extractUuid(question).orElse(null);
        List<String> missing = transactionId == null ? List.of("transactionId") : List.of();
        Map<String, Object> payload = transactionId == null
            ? Map.of()
            : Map.of("transactionId", transactionId.toString());
        return Optional.of(new CopilotActionPlan(
            "POS_RECEIPT_REPRINT",
            "POS_ACCESS",
            "Reprint POS receipt",
            transactionId == null ? "Reprint a POS receipt when a transaction id is provided." : "Reprint receipt for transaction " + transactionId + ".",
            payload,
            missing.isEmpty(),
            missing,
            false,
            "Receipt reprints cannot be undone, but they do not change accounting balances.",
            null
        ));
    }

    private Optional<CopilotActionPlan> planPosCheckout(String normalized, String question, Map<String, Object> uiContext) {
        if (!normalized.contains("checkout") && !normalized.contains("sell ") && !normalized.contains("complete sale")) {
            return Optional.empty();
        }
        List<Map<String, Object>> lines = new ArrayList<>();
        Matcher barcodeMatcher = BARCODE_LINE_PATTERN.matcher(question);
        while (barcodeMatcher.find()) {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("barcode", barcodeMatcher.group(1));
            line.put("quantity", barcodeMatcher.group(2) == null ? BigDecimal.ONE : new BigDecimal(barcodeMatcher.group(2)));
            lines.add(line);
        }

        List<Map<String, Object>> tenders = new ArrayList<>();
        extractTender(question, "cash", "CASH").ifPresent(tenders::add);
        extractTender(question, "momo", "MOMO").ifPresent(tenders::add);
        extractTender(question, "airtel", "AIRTEL_MONEY").ifPresent(tenders::add);
        extractTender(question, "card", "CARD").ifPresent(tenders::add);

        String registerCode = extractNamedParty(question, "(?i)register\\s+([A-Za-z0-9_-]+)");
        if (registerCode == null) {
            registerCode = extractUiRegisterCode(uiContext);
        }
        String currency = extractCurrency(question).orElse("RWF");

        List<String> missing = new ArrayList<>();
        if (lines.isEmpty()) missing.add("at least one barcode line (e.g. barcode 12345 qty 2)");
        if (tenders.isEmpty()) missing.add("at least one tender amount (e.g. cash 5000)");
        if (registerCode == null || registerCode.isBlank()) missing.add("posRegisterCode");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("currencyCode", currency);
        if (registerCode != null) payload.put("posRegisterCode", registerCode);
        if (!lines.isEmpty()) payload.put("lines", lines);
        if (!tenders.isEmpty()) payload.put("tenders", tenders);

        return Optional.of(new CopilotActionPlan(
            "POS_CHECKOUT",
            "POS_ACCESS",
            "Run POS checkout",
            "Complete a POS checkout from the prompt and current till context.",
            payload,
            missing.isEmpty(),
            missing,
            false,
            "Completed POS sales cannot be automatically reversed by copilot. Use the standard returns flow if a sale needs correction.",
            null
        ));
    }

    private Optional<CopilotActionPlan> planPurchaseOrder(String normalized, String question) {
        if (!normalized.contains("purchase order") && !normalized.contains("create po")) {
            return Optional.empty();
        }
        String supplierName = extractNamedParty(question, "(?i)(?:purchase\\s+order(?:\\s+for)?|create\\s+po\\s+for|supplier)\\s+(.+?)(?=\\s+(?:product|qty|quantity|unit\\s*cost|currency|deliver|by|on)\\b|$)");
        UUID productId = extractUuidAfter(question, "(?i)product(?:\\s+id)?\\s+");
        BigDecimal orderedQty = extractDecimalAfter(question, "(?i)(?:qty|quantity)\\s+");
        BigDecimal unitCost = extractDecimalAfter(question, "(?i)(?:unit\\s*cost|cost)\\s+");
        LocalDate deliveryDate = extractDate(question).orElse(null);
        String currency = extractCurrency(question).orElse("RWF");

        List<String> missing = new ArrayList<>();
        if (supplierName == null) missing.add("supplierName");
        if (productId == null) missing.add("productId");
        if (orderedQty == null) missing.add("orderedQty");
        if (unitCost == null) missing.add("unitCost");

        Map<String, Object> line = new LinkedHashMap<>();
        if (productId != null) line.put("productId", productId.toString());
        if (orderedQty != null) line.put("orderedQty", orderedQty);
        if (unitCost != null) line.put("unitCost", unitCost);
        if (supplierName != null) line.put("productName", "AI staged line item");

        Map<String, Object> supplier = new LinkedHashMap<>();
        if (supplierName != null) supplier.put("name", supplierName);

        Map<String, Object> payload = new LinkedHashMap<>();
        if (supplierName != null) payload.put("supplierName", supplierName);
        if (!supplier.isEmpty()) payload.put("supplier", supplier);
        payload.put("currencyCode", currency);
        if (deliveryDate != null) payload.put("expectedDeliveryDate", deliveryDate.toString());
        if (!line.isEmpty()) payload.put("lines", List.of(line));

        return Optional.of(new CopilotActionPlan(
            "CREATE_PURCHASE_ORDER",
            "PROCUREMENT_WRITE",
            "Create purchase order",
            "Create a purchase order from the prompt.",
            payload,
            missing.isEmpty(),
            missing,
            false,
            "Purchase orders do not yet have an automatic undo path. Review supplier, product, quantity, and cost before approval.",
            null
        ));
    }

    private Optional<CopilotActionPlan> planReturn(String normalized, String question) {
        if (!normalized.contains("return") && !normalized.contains("refund")) {
            return Optional.empty();
        }
        UUID transactionId = extractUuid(question).orElse(null);
        UUID productId = extractUuidAfter(question, "(?i)product(?:\\s+id)?\\s+");
        String sku = extractNamedParty(question, "(?i)sku\\s+([A-Za-z0-9_-]+)");
        String productName = extractNamedParty(question, "(?i)product\\s+name\\s+(.+?)(?=\\s+(?:qty|quantity|price|refund|reason|condition)\\b|$)");
        BigDecimal quantity = extractDecimalAfter(question, "(?i)(?:qty|quantity)\\s+");
        BigDecimal unitPrice = extractDecimalAfter(question, "(?i)(?:price|unit\\s*price)\\s+");
        String refundMethod = extractRefundMethod(normalized);
        String reason = extractNamedParty(question, "(?i)reason\\s+(.+?)(?=\\s+(?:refund|condition|qty|quantity|price)\\b|$)");

        List<String> missing = new ArrayList<>();
        if (transactionId == null) missing.add("originalTransactionId");
        if (productId == null) missing.add("productId");
        if (sku == null) missing.add("sku");
        if (productName == null) missing.add("productName");
        if (quantity == null) missing.add("quantity");
        if (unitPrice == null) missing.add("unitPrice");
        if (refundMethod == null) missing.add("refundMethod");
        if (reason == null) missing.add("reason");

        Map<String, Object> line = new LinkedHashMap<>();
        if (productId != null) line.put("productId", productId.toString());
        if (sku != null) line.put("sku", sku);
        if (productName != null) line.put("productName", productName);
        if (quantity != null) line.put("quantity", quantity);
        if (unitPrice != null) line.put("unitPrice", unitPrice);
        line.put("restock", true);
        line.put("condition", "RETURNED");

        Map<String, Object> payload = new LinkedHashMap<>();
        if (transactionId != null) payload.put("originalTransactionId", transactionId.toString());
        payload.put("tillCode", "AI-COPILOT");
        if (reason != null) payload.put("reason", reason);
        if (refundMethod != null) payload.put("refundMethod", refundMethod);
        if (!line.isEmpty()) payload.put("lines", List.of(line));

        return Optional.of(new CopilotActionPlan(
            "INITIATE_POS_RETURN",
            "POS_RETURNS",
            "Initiate POS return",
            "Stage a POS return request from the prompt.",
            payload,
            missing.isEmpty(),
            missing,
            false,
            "Approved returns immediately affect stock, refunds, and analytics. Review carefully before approval.",
            null
        ));
    }

    private String extractNamedParty(String question, String regex) {
        Matcher matcher = Pattern.compile(regex).matcher(question);
        if (!matcher.find()) {
            return null;
        }
        String value = matcher.group(1);
        return value == null || value.isBlank() ? null : value.trim().replaceAll("[.,]$", "");
    }

    private BigDecimal extractAmount(String question) {
        BigDecimal amount = extractDecimalAfter(question, "(?i)(?:amount|total)\\s+");
        if (amount != null) {
            return amount;
        }
        Matcher matcher = Pattern.compile("(?i)for\\s+(\\d+(?:\\.\\d{1,2})?)").matcher(question);
        if (matcher.find()) {
            return new BigDecimal(matcher.group(1));
        }
        return null;
    }

    private Optional<String> extractCurrency(String question) {
        Matcher matcher = Pattern.compile("(?i)\\b(RWF|FRW|USD|EUR)\\b").matcher(question);
        if (!matcher.find()) {
            return Optional.empty();
        }
        String raw = matcher.group(1).toUpperCase(Locale.ROOT);
        return Optional.of("FRW".equals(raw) ? "RWF" : raw);
    }

    private Optional<LocalDate> extractDate(String question) {
        Matcher matcher = DATE_PATTERN.matcher(question);
        if (!matcher.find()) {
            return Optional.empty();
        }
        return Optional.of(LocalDate.parse(matcher.group(1)));
    }

    private Optional<UUID> extractUuid(String question) {
        Matcher matcher = UUID_PATTERN.matcher(question);
        if (!matcher.find()) {
            return Optional.empty();
        }
        return Optional.of(UUID.fromString(matcher.group()));
    }

    private UUID extractUuidAfter(String question, String prefixRegex) {
        Matcher matcher = Pattern.compile(prefixRegex + "(" + UUID_PATTERN.pattern() + ")").matcher(question);
        if (!matcher.find()) {
            return null;
        }
        return UUID.fromString(matcher.group(1));
    }

    private BigDecimal extractDecimalAfter(String question, String prefixRegex) {
        Matcher matcher = Pattern.compile(prefixRegex + DECIMAL_PATTERN.pattern()).matcher(question);
        if (!matcher.find()) {
            return null;
        }
        return new BigDecimal(matcher.group(1));
    }

    private Optional<Map<String, Object>> extractTender(String question, String keyword, String tenderType) {
        Matcher matcher = Pattern.compile("(?i)" + keyword + "\\s+(\\d+(?:\\.\\d{1,2})?)").matcher(question);
        if (!matcher.find()) {
            return Optional.empty();
        }
        return Optional.of(Map.of(
            "tenderType", tenderType,
            "amount", new BigDecimal(matcher.group(1))
        ));
    }

    private String extractUiRegisterCode(Map<String, Object> uiContext) {
        Object till = uiContext == null ? null : uiContext.get("tillSession");
        if (!(till instanceof Map<?, ?> tillMap)) {
            return null;
        }
        Object registerCode = tillMap.get("registerCode");
        return registerCode == null ? null : String.valueOf(registerCode);
    }

    private String extractRefundMethod(String normalized) {
        if (normalized.contains("refund momo") || normalized.contains("momo refund")) {
            return "MOMO";
        }
        if (normalized.contains("refund airtel")) {
            return "AIRTEL_MONEY";
        }
        if (normalized.contains("refund card")) {
            return "CARD";
        }
        if (normalized.contains("refund cash") || normalized.contains("cash refund")) {
            return "CASH";
        }
        return null;
    }
}
