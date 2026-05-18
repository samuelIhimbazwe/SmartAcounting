package com.smartaccounting.service;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;

@Component
public class BoardReportPdfGenerator {

    public byte[] generate(Map<String, Object> data) {
        StringBuilder sb = new StringBuilder();
        sb.append("BOARD REPORT\n");
        sb.append("===========\n\n");
        sb.append("Tenant: ").append(data.getOrDefault("tenantName", "")).append('\n');
        sb.append("Period: ").append(data.getOrDefault("period", "")).append('\n');
        sb.append("Generated: ").append(data.getOrDefault("generatedAt", Instant.now())).append("\n\n");

        sb.append("P&L\n---\n");
        appendLine(sb, "Revenue", data.get("revenue"));
        appendLine(sb, "Gross margin %", data.get("grossMargin"));
        appendLine(sb, "Cash position", data.get("cashPosition"));
        appendLine(sb, "DSO (days)", data.get("dso"));
        appendLine(sb, "DPO (days)", data.get("dpo"));

        sb.append("\nSales\n-----\n");
        appendLine(sb, "Revenue vs target", data.get("revenueVsTarget"));
        appendLine(sb, "Top product", data.get("topProduct"));

        sb.append("\nCompliance\n----------\n");
        appendLine(sb, "VAT output", data.get("vatOutput"));
        appendLine(sb, "VAT input", data.get("vatInput"));
        appendLine(sb, "Net VAT payable", data.get("vatPayable"));

        sb.append("\n-- End of report --\n");
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendLine(StringBuilder sb, String label, Object value) {
        sb.append(label).append(": ").append(value == null ? "n/a" : value).append('\n');
    }
}
