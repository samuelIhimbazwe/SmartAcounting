package com.smartaccounting.service;

import com.smartaccounting.config.ReceiptProperties;
import com.smartaccounting.entity.PosCatalogItem;
import com.smartaccounting.entity.PosPaymentTender;
import com.smartaccounting.entity.PosSaleLine;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.repository.PosCatalogItemRepository;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.PosSaleLineRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PosReceiptService {
    private static final String ESC = "\u001B";
    private static final String GS = "\u001D";
    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final SalesOrderRepository salesOrderRepository;
    private final PosSaleLineRepository saleLineRepository;
    private final PosPaymentTenderRepository tenderRepository;
    private final PosCatalogItemRepository catalogRepository;
    private final SmsDispatchService smsDispatchService;
    private final ReceiptProperties receiptProperties;

    public PosReceiptService(SalesOrderRepository salesOrderRepository,
                             PosSaleLineRepository saleLineRepository,
                             PosPaymentTenderRepository tenderRepository,
                             PosCatalogItemRepository catalogRepository,
                             SmsDispatchService smsDispatchService,
                             ReceiptProperties receiptProperties) {
        this.salesOrderRepository = salesOrderRepository;
        this.saleLineRepository = saleLineRepository;
        this.tenderRepository = tenderRepository;
        this.catalogRepository = catalogRepository;
        this.smsDispatchService = smsDispatchService;
        this.receiptProperties = receiptProperties;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> print(UUID transactionId, boolean reprint) {
        UUID tenant = requireTenant();
        SalesOrder order = salesOrderRepository.findById(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!tenant.equals(order.getTenantId()) || !"POS".equals(order.getSalesChannel())) {
            throw new IllegalArgumentException("Order not found");
        }

        List<PosSaleLine> lines = saleLineRepository.findByTenantIdAndSalesOrderIdOrderByIdAsc(tenant, transactionId);
        List<PosPaymentTender> tenders = tenderRepository.findByTenantIdAndSalesOrderIdOrderByCreatedAtAsc(tenant, transactionId);
        Map<UUID, PosCatalogItem> catalogById = catalogRepository.findAllById(
                lines.stream().map(PosSaleLine::getCatalogItemId).collect(Collectors.toSet()))
            .stream()
            .collect(Collectors.toMap(PosCatalogItem::getId, c -> c));

        String cashier = Optional.ofNullable(TenantContext.userId()).map(UUID::toString).orElse("SYSTEM");
        String escpos = buildEscPos(order, lines, tenders, catalogById, cashier, reprint);
        String receiptText = buildSmsText(order, tenders);
        int smsSent = maybeSendSmsReceipt(order, tenders, receiptText);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("transactionId", order.getId());
        out.put("printerType", normalizePrinterType(receiptProperties.getPrinterType()));
        out.put("escPos", escpos);
        out.put("receiptText", receiptText);
        out.put("reprint", reprint);
        out.put("smsReceiptsSent", smsSent);
        return out;
    }

    private int maybeSendSmsReceipt(SalesOrder order, List<PosPaymentTender> tenders, String message) {
        List<String> phones = tenders.stream()
            .filter(t -> "MOMO".equals(t.getTenderType()) || "AIRTEL_MONEY".equals(t.getTenderType()))
            .map(PosPaymentTender::getPayerPhone)
            .filter(p -> p != null && !p.isBlank())
            .distinct()
            .toList();
        if (phones.isEmpty()) {
            return 0;
        }
        return smsDispatchService.send(order.getTenantId(), UUID.randomUUID(), "POS_RECEIPT", phones, message);
    }

    private String buildEscPos(SalesOrder order,
                               List<PosSaleLine> lines,
                               List<PosPaymentTender> tenders,
                               Map<UUID, PosCatalogItem> catalogById,
                               String cashier,
                               boolean reprint) {
        String currency = order.getCurrencyCode();
        StringBuilder b = new StringBuilder();
        b.append(ESC).append("@");
        b.append(ESC).append("a").append((char) 1);
        b.append(center(receiptProperties.getStoreName())).append("\n");
        if (!receiptProperties.getStoreAddress().isBlank()) {
            b.append(center(receiptProperties.getStoreAddress())).append("\n");
        }
        b.append(ESC).append("a").append((char) 0);
        b.append(repeat("-", 48)).append("\n");
        if (reprint) {
            b.append("** REPRINT **\n");
        }
        b.append("Date: ")
            .append(TS_FMT.format(order.getCreatedAt().atZone(ZoneId.systemDefault())))
            .append("\n");
        b.append("Cashier: ").append(cashier).append("\n");
        if (order.getPosRegisterCode() != null && !order.getPosRegisterCode().isBlank()) {
            b.append("Register: ").append(order.getPosRegisterCode()).append("\n");
        }
        b.append("Txn Ref: ").append(resolveTxnRef(order, tenders)).append("\n");
        b.append(repeat("-", 48)).append("\n");
        b.append(padRight("SKU", 12))
            .append(padLeft("QTY", 8))
            .append(padLeft("UNIT", 12))
            .append(padLeft("TOTAL", 16))
            .append("\n");
        for (PosSaleLine line : lines) {
            PosCatalogItem item = catalogById.get(line.getCatalogItemId());
            String sku = item != null && item.getSku() != null ? item.getSku() : line.getBarcodeSnapshot();
            b.append(padRight(trimTo(sku, 12), 12))
                .append(padLeft(fmtQty(line.getQuantity()), 8))
                .append(padLeft(line.getUnitPrice().setScale(2, RoundingMode.HALF_UP).toPlainString(), 12))
                .append(padLeft(line.getLineTotal().setScale(2, RoundingMode.HALF_UP).toPlainString(), 16))
                .append("\n");
            if (line.getLotCode() != null && !line.getLotCode().isBlank()) {
                b.append("  Lot: ").append(trimTo(line.getLotCode(), 40)).append("\n");
            }
            if (line.getSerialNumber() != null && !line.getSerialNumber().isBlank()) {
                b.append("  SN: ").append(trimTo(line.getSerialNumber(), 40)).append("\n");
            }
        }
        b.append(repeat("-", 48)).append("\n");
        for (PosPaymentTender t : tenders) {
            b.append("Pay ")
                .append(tenderLabel(t.getTenderType()))
                .append(": ")
                .append(t.getAmount().setScale(2, RoundingMode.HALF_UP).toPlainString());
            if (t.getReference() != null && !t.getReference().isBlank()) {
                b.append(" [").append(trimTo(t.getReference(), 18)).append("]");
            }
            b.append("\n");
        }
        BigDecimal change = calculateChange(tenders, order.getTotalAmount());
        b.append("TOTAL: ")
            .append(order.getTotalAmount().setScale(2, RoundingMode.HALF_UP).toPlainString())
            .append(" ")
            .append(currency)
            .append("\n");
        b.append("CHANGE: ").append(change.setScale(2, RoundingMode.HALF_UP).toPlainString()).append(" ").append(currency).append("\n");
        if (!receiptProperties.getFooterText().isBlank()) {
            b.append(repeat("-", 48)).append("\n");
            b.append(receiptProperties.getFooterText()).append("\n");
        }
        b.append("\n\n").append(GS).append("V").append((char) 66).append((char) 0);
        return b.toString();
    }

    private String buildSmsText(SalesOrder order, List<PosPaymentTender> tenders) {
        return "Receipt " + order.getId()
            + " total " + order.getTotalAmount().setScale(2, RoundingMode.HALF_UP).toPlainString()
            + " " + order.getCurrencyCode()
            + ", paid via " + tenders.stream().map(t -> tenderLabel(t.getTenderType())).distinct().collect(Collectors.joining("/"));
    }

    private String resolveTxnRef(SalesOrder order, List<PosPaymentTender> tenders) {
        return tenders.stream()
            .filter(t -> t.getReference() != null && !t.getReference().isBlank())
            .map(PosPaymentTender::getReference)
            .findFirst()
            .orElse(order.getId().toString());
    }

    private static BigDecimal calculateChange(List<PosPaymentTender> tenders, BigDecimal total) {
        BigDecimal cash = tenders.stream()
            .filter(t -> "CASH".equals(t.getTenderType()))
            .map(PosPaymentTender::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal nonCash = tenders.stream()
            .filter(t -> !"CASH".equals(t.getTenderType()))
            .map(PosPaymentTender::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal dueFromCash = total.subtract(nonCash);
        if (dueFromCash.signum() < 0) {
            dueFromCash = BigDecimal.ZERO;
        }
        BigDecimal change = cash.subtract(dueFromCash);
        return change.signum() > 0 ? change : BigDecimal.ZERO;
    }

    private static String normalizePrinterType(String printerTypeRaw) {
        String p = printerTypeRaw == null ? "thermal" : printerTypeRaw.trim().toLowerCase(Locale.ROOT);
        return switch (p) {
            case "thermal", "pdf", "sms-only" -> p;
            default -> "thermal";
        };
    }

    private static String tenderLabel(String tenderType) {
        if (tenderType == null) return "";
        return switch (tenderType) {
            case "MOMO" -> "MTN MoMo";
            case "AIRTEL_MONEY" -> "Airtel Money";
            case "ON_ACCOUNT" -> "On account";
            default -> tenderType;
        };
    }

    private static String trimTo(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String fmtQty(BigDecimal qty) {
        return qty.stripTrailingZeros().toPlainString();
    }

    private static String padLeft(String s, int width) {
        String v = s == null ? "" : s;
        if (v.length() >= width) return v;
        return " ".repeat(width - v.length()) + v;
    }

    private static String padRight(String s, int width) {
        String v = s == null ? "" : s;
        if (v.length() >= width) return v;
        return v + " ".repeat(width - v.length());
    }

    private static String repeat(String value, int count) {
        return value.repeat(Math.max(0, count));
    }

    private static String center(String value) {
        return value == null ? "" : value.trim();
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
