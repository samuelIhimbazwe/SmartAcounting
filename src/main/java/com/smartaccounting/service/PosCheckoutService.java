package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.CreateInvoiceRequest;
import com.smartaccounting.dto.CreatePosCatalogItemRequest;
import com.smartaccounting.dto.ApplicablePromotion;
import com.smartaccounting.dto.PosCheckoutLineRequest;
import com.smartaccounting.dto.PosCheckoutRequest;
import com.smartaccounting.dto.PosOutOfStockAttemptRequest;
import com.smartaccounting.dto.PosTenderRequest;
import com.smartaccounting.dto.PromotionCartItem;
import com.smartaccounting.entity.FinanceCustomer;
import com.smartaccounting.entity.TaxConfig;
import com.smartaccounting.entity.TillSession;
import com.smartaccounting.entity.PosCatalogItem;
import com.smartaccounting.entity.PosPaymentTender;
import com.smartaccounting.entity.PosSaleLine;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.exception.CreditLimitExceededException;
import com.smartaccounting.events.DomainEventPublisher;
import com.smartaccounting.repository.PosCatalogItemRepository;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.PosSaleLineRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import com.smartaccounting.repository.TillSessionRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class PosCheckoutService {

    public static final Set<String> TENDER_TYPES = Set.of("CASH", "MOMO", "AIRTEL_MONEY", "CARD", "ON_ACCOUNT");

    private final PosCatalogItemRepository catalogRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final PosSaleLineRepository saleLineRepository;
    private final PosPaymentTenderRepository tenderRepository;
    private final AuditService auditService;
    private final DomainEventPublisher eventPublisher;
    private final InventoryService inventoryService;
    private final ReceivablesPayablesService receivablesPayablesService;
    private final CurrencyService currencyService;
    private final PosVatService posVatService;
    private final EbmService ebmService;
    private final SalesAnalyticsService salesAnalyticsService;
    private final PromotionService promotionService;
    private final PriceListService priceListService;
    private final CustomerRetailService customerRetailService;
    private final LocationService locationService;
    private final TaxConfigService taxConfigService;
    private final RraEfdService rraEfdService;
    private final TillSessionRepository tillSessionRepository;

    public PosCheckoutService(PosCatalogItemRepository catalogRepository,
                              SalesOrderRepository salesOrderRepository,
                              PosSaleLineRepository saleLineRepository,
                              PosPaymentTenderRepository tenderRepository,
                              AuditService auditService,
                              DomainEventPublisher eventPublisher,
                              InventoryService inventoryService,
                              ReceivablesPayablesService receivablesPayablesService,
                              CurrencyService currencyService,
                              PosVatService posVatService,
                              EbmService ebmService,
                              SalesAnalyticsService salesAnalyticsService,
                              PromotionService promotionService,
                              PriceListService priceListService,
                              CustomerRetailService customerRetailService,
                              LocationService locationService,
                              TaxConfigService taxConfigService,
                              RraEfdService rraEfdService,
                              TillSessionRepository tillSessionRepository) {
        this.catalogRepository = catalogRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.saleLineRepository = saleLineRepository;
        this.tenderRepository = tenderRepository;
        this.auditService = auditService;
        this.eventPublisher = eventPublisher;
        this.inventoryService = inventoryService;
        this.receivablesPayablesService = receivablesPayablesService;
        this.currencyService = currencyService;
        this.posVatService = posVatService;
        this.ebmService = ebmService;
        this.salesAnalyticsService = salesAnalyticsService;
        this.promotionService = promotionService;
        this.priceListService = priceListService;
        this.customerRetailService = customerRetailService;
        this.locationService = locationService;
        this.taxConfigService = taxConfigService;
        this.rraEfdService = rraEfdService;
        this.tillSessionRepository = tillSessionRepository;
    }

    @Transactional(readOnly = true)
    public PosCatalogItem scanBarcode(String barcodeRaw) {
        UUID tenant = requireTenant();
        String barcode = normalizeBarcode(barcodeRaw);
        return catalogRepository.findByTenantIdAndBarcodeAndActiveTrue(tenant, barcode)
            .orElseThrow(() -> new IllegalArgumentException("Unknown barcode"));
    }

    @Transactional
    public UUID upsertCatalogItem(CreatePosCatalogItemRequest req) {
        UUID tenant = requireTenant();
        String barcode = normalizeBarcode(req.barcode());
        PosCatalogItem item = catalogRepository.findByTenantIdAndBarcodeAndActiveTrue(tenant, barcode)
            .orElseGet(() -> {
                PosCatalogItem n = new PosCatalogItem();
                n.setId(UUID.randomUUID());
                n.setTenantId(tenant);
                n.setBarcode(barcode);
                n.setCreatedAt(Instant.now());
                return n;
            });
        item.setSku(req.sku());
        item.setDisplayName(req.displayName());
        item.setUnitPrice(req.unitPrice().setScale(2, RoundingMode.HALF_UP));
        item.setCurrencyCode(req.currencyCode().toUpperCase(Locale.ROOT));
        item.setProductId(req.productId());
        if (req.reorderPoint() != null) {
            item.setReorderPoint(req.reorderPoint().setScale(4, RoundingMode.HALF_UP));
        } else {
            item.setReorderPoint(null);
        }
        item.setActive(true);
        catalogRepository.save(item);
        auditService.logAction("POS_CATALOG_UPSERT", "POS_CATALOG", "{}", "{\"barcode\":\"" + barcode + "\"}");
        return item.getId();
    }

    @Transactional
    public Map<String, Object> checkout(PosCheckoutRequest req) {
        UUID tenant = requireTenant();
        String currency = req.currencyCode().toUpperCase(Locale.ROOT);

        FinanceCustomer linkedCustomer = null;
        UUID customerPriceListId = null;
        if (req.customerId() != null) {
            linkedCustomer = customerRetailService.requireCustomer(req.customerId());
            customerPriceListId = linkedCustomer.getPriceListId();
        }
        UUID locationId = locationService.resolveContextLocationId();
        boolean taxExempt = linkedCustomer != null && linkedCustomer.isTaxExempt();
        UUID tillSessionId = resolveOpenTillSessionId(tenant);

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal orderNet = BigDecimal.ZERO;
        BigDecimal orderVat = BigDecimal.ZERO;
        UUID orderId = UUID.randomUUID();
        List<PromotionCartItem> cartItems = new ArrayList<>();

        SalesOrder order = new SalesOrder();
        order.setId(orderId);
        order.setTenantId(tenant);
        String displayName = linkedCustomer != null
            ? linkedCustomer.getCustomerName()
            : (req.customerName() != null ? req.customerName() : "Walk-in");
        order.setCustomerName(displayName);
        order.setStatus("COMPLETED");
        order.setCurrencyCode(currency);
        order.setSalesChannel("POS");
        order.setPosRegisterCode(req.posRegisterCode());
        order.setCreatedAt(Instant.now());
        order.setTotalAmount(BigDecimal.ZERO);
        order.setTaxExemptSale(taxExempt);
        order.setTillSessionId(tillSessionId);
        salesOrderRepository.save(order);

        for (PosCheckoutLineRequest lineReq : req.lines()) {
            String bc = normalizeBarcode(lineReq.barcode());
            PosCatalogItem cat = catalogRepository.findByTenantIdAndBarcodeAndActiveTrue(tenant, bc)
                .orElseThrow(() -> new IllegalArgumentException("Unknown barcode: " + bc));
            String catCur = cat.getCurrencyCode().toUpperCase(Locale.ROOT);
            BigDecimal qty = lineReq.quantity().setScale(4, RoundingMode.HALF_UP);
            BigDecimal unitNative = cat.getUnitPrice().setScale(2, RoundingMode.HALF_UP);
            UUID productId = lineReq.productId() != null ? lineReq.productId() : cat.getProductId();
            if (productId != null) {
                unitNative = priceListService.resolveCheckoutUnitPrice(
                    locationId,
                    customerPriceListId,
                    productId,
                    lineReq.variantId(),
                    unitNative);
            }
            BigDecimal unit = currency.equals(catCur)
                ? unitNative
                : currencyService.convertAmount(unitNative, catCur, currency).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = unit.multiply(qty).setScale(2, RoundingMode.HALF_UP);
            TaxConfig taxConfig = taxConfigService.resolveForProduct(productId, locationId);
            TaxConfigService.LineVatSplit vatSplit = taxConfigService.calculateLineVat(lineTotal, taxConfig, taxExempt);

            PosSaleLine sl = new PosSaleLine();
            sl.setId(UUID.randomUUID());
            sl.setTenantId(tenant);
            sl.setSalesOrderId(orderId);
            sl.setCatalogItemId(cat.getId());
            sl.setBarcodeSnapshot(bc);
            sl.setProductNameSnapshot(cat.getDisplayName());
            sl.setQuantity(qty);
            sl.setUnitPrice(unit);
            sl.setLineTotal(lineTotal);
            sl.setNetAmount(vatSplit.net());
            sl.setVatAmount(vatSplit.vat());
            sl.setProductIdSnapshot(lineReq.productId() != null ? lineReq.productId() : cat.getProductId());
            sl.setVariantId(lineReq.variantId());
            sl.setSerialNumber(lineReq.serialNumber());
            sl.setLotCode(lineReq.batchNumber());
            saleLineRepository.save(sl);

            subtotal = subtotal.add(lineTotal);
            orderNet = orderNet.add(vatSplit.net());
            orderVat = orderVat.add(vatSplit.vat());
            UUID promoProductId = productId;
            if (promoProductId != null) {
                cartItems.add(new PromotionCartItem(
                    promoProductId,
                    cat.getSku(),
                    null,
                    lineTotal,
                    qty
                ));
            }
        }

        List<ApplicablePromotion> promos = promotionService.getApplicablePromotions(
            tenant.toString(), cartItems, subtotal);
        BigDecimal discountAmount = BigDecimal.ZERO;
        UUID appliedPromotionId = null;
        if (!promos.isEmpty()) {
            ApplicablePromotion best = promos.get(0);
            discountAmount = best.discountAmount();
            appliedPromotionId = best.promotionId();
        }
        if (linkedCustomer != null && req.loyaltyPointsRedeemed() != null && req.loyaltyPointsRedeemed() > 0) {
            BigDecimal loyaltyDisc = new BigDecimal(
                customerRetailService.loyaltyDiscountFromPoints(req.loyaltyPointsRedeemed()));
            discountAmount = discountAmount.add(loyaltyDisc);
            customerRetailService.redeemLoyaltyPoints(linkedCustomer, req.loyaltyPointsRedeemed());
        }
        BigDecimal total = subtotal.subtract(discountAmount).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        if (taxExempt) {
            order.setNetAmount(total);
            order.setVatAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        } else if (discountAmount.signum() > 0 && subtotal.signum() > 0) {
            var adjusted = posVatService.calculateVat(total);
            order.setNetAmount(adjusted.netAmount());
            order.setVatAmount(adjusted.vatAmount());
        } else {
            order.setNetAmount(orderNet.setScale(2, RoundingMode.HALF_UP));
            order.setVatAmount(orderVat.setScale(2, RoundingMode.HALF_UP));
        }

        order.setTotalAmount(total);
        salesOrderRepository.save(order);

        BigDecimal tenderSum = BigDecimal.ZERO;
        for (PosTenderRequest t : req.tenders()) {
            String tt = t.tenderType().trim().toUpperCase(Locale.ROOT);
            if (!TENDER_TYPES.contains(tt)) {
                throw new IllegalArgumentException("Invalid tender type: " + t.tenderType());
            }
            BigDecimal amt = t.amount().setScale(2, RoundingMode.HALF_UP);
            tenderSum = tenderSum.add(amt);

            PosPaymentTender row = new PosPaymentTender();
            row.setId(UUID.randomUUID());
            row.setTenantId(tenant);
            row.setSalesOrderId(orderId);
            row.setTenderType(tt);
            row.setAmount(amt);
            row.setReference(t.reference());
            if ("CASH".equals(tt) || "CARD".equals(tt) || "ON_ACCOUNT".equals(tt)) {
                row.setReconciliationStatus("NA");
            } else {
                row.setReconciliationStatus("PENDING");
            }
            row.setCreatedAt(Instant.now());
            tenderRepository.save(row);
        }

        if (tenderSum.compareTo(total) != 0) {
            throw new IllegalArgumentException(
                "Tender total " + tenderSum + " does not match order total " + total
            );
        }

        BigDecimal onAccountTotal = BigDecimal.ZERO;
        for (PosTenderRequest t : req.tenders()) {
            if ("ON_ACCOUNT".equals(t.tenderType().trim().toUpperCase(Locale.ROOT))) {
                onAccountTotal = onAccountTotal.add(t.amount().setScale(2, RoundingMode.HALF_UP));
            }
        }
        if (onAccountTotal.signum() > 0) {
            FinanceCustomer customer;
            if (linkedCustomer != null) {
                customer = linkedCustomer;
            } else {
                String acct = req.onAccountCustomerName();
                if (acct == null || acct.isBlank()) {
                    throw new IllegalArgumentException("onAccountCustomerName is required when using ON_ACCOUNT tender");
                }
                customer = receivablesPayablesService.resolveOrCreateCustomerForOnAccount(acct.trim());
            }
            BigDecimal currentBalance = receivablesPayablesService.openArBalance(customer.getId());
            BigDecimal creditLimit = customer.getCreditLimit() == null
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : customer.getCreditLimit().setScale(2, RoundingMode.HALF_UP);
            BigDecimal projected = currentBalance.add(onAccountTotal).setScale(2, RoundingMode.HALF_UP);
            boolean overrideAllowed = Boolean.TRUE.equals(req.managerOverride()) && hasAnyAuthority("ROLE_ACCOUNTING_CONTROLLER", "ROLE_CFO");
            if (!overrideAllowed && projected.compareTo(creditLimit) > 0) {
                BigDecimal availableCredit = creditLimit.subtract(currentBalance).setScale(2, RoundingMode.HALF_UP);
                if (availableCredit.signum() < 0) {
                    availableCredit = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                }
                throw new CreditLimitExceededException(currentBalance, creditLimit, availableCredit);
            }
            receivablesPayablesService.createInvoice(new CreateInvoiceRequest(
                customer.getCustomerName(),
                onAccountTotal.setScale(2, RoundingMode.HALF_UP),
                currency,
                LocalDate.now().plusDays(14)
            ));
            customerRetailService.applyOnAccountCharge(customer, onAccountTotal);
        }

        if (linkedCustomer != null) {
            customerRetailService.earnLoyaltyPoints(
                linkedCustomer, orderId, total);
        }

        List<PosSaleLine> committedLines = saleLineRepository.findByTenantIdAndSalesOrderIdOrderByIdAsc(tenant, orderId);
        for (PosSaleLine sl : committedLines) {
            PosCatalogItem cat = catalogRepository.findById(sl.getCatalogItemId())
                .filter(c -> tenant.equals(c.getTenantId()))
                .orElseThrow(() -> new IllegalStateException("Catalog row missing for sale line"));
            UUID invProductId = sl.getProductIdSnapshot() != null
                ? sl.getProductIdSnapshot()
                : cat.getProductId();
            if (invProductId != null) {
                try {
                    List<InventoryService.BatchCostAllocation> allocations = inventoryService.deductForPosSale(
                        invProductId,
                        sl.getQuantity(),
                        orderId,
                        cat.getBarcode(),
                        cat.getReorderPoint(),
                        sl.getLotCode()
                    );
                    applyBatchCostsToSaleLines(sl, allocations);
                } catch (IllegalArgumentException ex) {
                    if (ex.getMessage() != null && ex.getMessage().contains("Insufficient stock")) {
                        String cashierId = TenantContext.userId() != null
                            ? TenantContext.userId().toString() : "unknown";
                        salesAnalyticsService.recordLostSale(
                            tenant.toString(),
                            cat.getProductId(),
                            cat.getSku(),
                            cat.getDisplayName(),
                            sl.getQuantity(),
                            cat.getUnitPrice(),
                            cashierId,
                            req.posRegisterCode()
                        );
                    }
                    throw ex;
                }
            }
        }

        eventPublisher.publish("sales.events", "POS_CHECKOUT_COMPLETED", Map.of(
            "tenantId", tenant.toString(),
            "salesOrderId", orderId.toString(),
            "totalAmount", total,
            "currencyCode", currency
        ));
        auditService.logAction("POS_CHECKOUT", "SALES_ORDER", "{}", "{\"id\":\"" + orderId + "\"}");

        Map<String, String> fiscal = taxExempt
            ? Map.of()
            : rraEfdService.mockFiscalPayload(orderId, total, order.getVatAmount());
        if (!fiscal.isEmpty()) {
            order.setFiscalSignature(fiscal.get("fiscalSignature"));
            order.setFiscalQrData(fiscal.get("fiscalQrData"));
            salesOrderRepository.save(order);
        }
        rraEfdService.submitSaleAsync(
            tenant,
            orderId.toString(),
            total,
            order.getVatAmount() != null ? order.getVatAmount() : BigDecimal.ZERO,
            currency,
            taxExempt
        );

        if (appliedPromotionId != null) {
            promotionService.recordUsage(
                tenant.toString(),
                appliedPromotionId,
                orderId.toString(),
                discountAmount,
                subtotal,
                total,
                currency
            );
        }

        String cashierId = TenantContext.userId() != null
            ? TenantContext.userId().toString() : "unknown";
        String cashierName = req.cashierName() != null && !req.cashierName().isBlank()
            ? req.cashierName() : cashierId;
        int hour = LocalTime.now(ZoneId.of("Africa/Kigali")).getHour();
        salesAnalyticsService.recordSale(
            tenant.toString(),
            cashierId,
            cashierName,
            req.posRegisterCode(),
            total,
            currency,
            LocalDate.now(),
            hour
        );
        if (req.outOfStockAttempts() != null) {
            for (PosOutOfStockAttemptRequest oos : req.outOfStockAttempts()) {
                salesAnalyticsService.recordLostSale(
                    tenant.toString(),
                    oos.productId(),
                    oos.sku(),
                    oos.productName(),
                    oos.attemptedQuantity(),
                    oos.unitPrice(),
                    cashierId,
                    req.posRegisterCode()
                );
            }
        }

        List<PosSaleLine> lines = saleLineRepository.findByTenantIdAndSalesOrderIdOrderByIdAsc(tenant, orderId);
        List<PosPaymentTender> tenders = tenderRepository.findByTenantIdAndSalesOrderIdOrderByCreatedAtAsc(tenant, orderId);

        Map<String, Object> receipt = buildReceipt(order, lines, tenders);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("salesOrderId", orderId);
        out.put("totalAmount", total);
        out.put("subtotal", subtotal);
        out.put("discountAmount", discountAmount);
        out.put("currencyCode", currency);
        out.put("receiptText", receipt.get("text"));
        out.put("receiptHtml", receipt.get("html"));
        out.put("netAmount", order.getNetAmount());
        out.put("vatAmount", order.getVatAmount());
        out.put("taxExempt", taxExempt);
        out.put("fiscalSignature", order.getFiscalSignature());
        out.put("fiscalQrData", order.getFiscalQrData());
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> receipt(UUID salesOrderId) {
        UUID tenant = requireTenant();
        SalesOrder order = salesOrderRepository.findById(salesOrderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!tenant.equals(order.getTenantId())) {
            throw new IllegalArgumentException("Order not found");
        }
        if (!"POS".equals(order.getSalesChannel())) {
            throw new IllegalArgumentException("Not a POS order");
        }
        List<PosSaleLine> lines = saleLineRepository.findByTenantIdAndSalesOrderIdOrderByIdAsc(tenant, salesOrderId);
        List<PosPaymentTender> tenders = tenderRepository.findByTenantIdAndSalesOrderIdOrderByCreatedAtAsc(tenant, salesOrderId);
        return buildReceipt(order, lines, tenders);
    }

    private Map<String, Object> buildReceipt(SalesOrder order, List<PosSaleLine> lines, List<PosPaymentTender> tenders) {
        String currency = order.getCurrencyCode();
        StringBuilder text = new StringBuilder();
        text.append("SMARTCHAIN POS\n");
        text.append("Receipt\n");
        text.append("Order: ").append(order.getId()).append("\n");
        text.append("Time: ").append(order.getCreatedAt()).append("\n");
        if (order.getPosRegisterCode() != null) {
            text.append("Register: ").append(order.getPosRegisterCode()).append("\n");
        }
        text.append("--------------------------------\n");
        for (PosSaleLine l : lines) {
            text.append(l.getProductNameSnapshot()).append("\n");
            text.append("  ")
                .append(l.getQuantity().stripTrailingZeros().toPlainString()).append(" x ")
                .append(l.getUnitPrice()).append(" ")
                .append(currency).append(" = ").append(l.getLineTotal()).append("\n");
        }
        text.append("--------------------------------\n");
        if (order.getNetAmount() != null) {
            text.append("Subtotal (ex VAT): ").append(order.getNetAmount()).append(" ").append(currency).append("\n");
        }
        if (order.getVatAmount() != null) {
            text.append("VAT: ").append(order.getVatAmount()).append(" ").append(currency);
            if (order.isTaxExemptSale()) {
                text.append(" (EXEMPT)");
            }
            text.append("\n");
        }
        text.append("TOTAL: ").append(order.getTotalAmount()).append(" ").append(currency).append("\n");
        if (order.getFiscalSignature() != null) {
            text.append("Fiscal sig: ").append(order.getFiscalSignature()).append("\n");
        }
        text.append("Payments:\n");
        for (PosPaymentTender t : tenders) {
            text.append("  ").append(tenderLabel(t.getTenderType())).append(": ").append(t.getAmount()).append(" ").append(currency);
            if (t.getReference() != null && !t.getReference().isBlank()) {
                text.append(" (").append(t.getReference()).append(")");
            }
            text.append("\n");
        }
        text.append("\nThank you.\n");

        String html = "<pre style=\"font-family: ui-monospace, monospace; font-size: 12px;\">"
            + escapeHtml(text.toString())
            + "</pre>";

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("text", text.toString());
        out.put("html", html);
        return out;
    }

    private static String tenderLabel(String tenderType) {
        if (tenderType == null) {
            return "";
        }
        return switch (tenderType) {
            case "MOMO" -> "MTN MoMo";
            case "AIRTEL_MONEY" -> "Airtel Money";
            case "ON_ACCOUNT" -> "On account";
            default -> tenderType;
        };
    }

    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String normalizeBarcode(String barcodeRaw) {
        if (barcodeRaw == null) throw new IllegalArgumentException("Barcode required");
        String b = barcodeRaw.trim();
        if (b.isEmpty()) throw new IllegalArgumentException("Barcode required");
        return b;
    }

    private void applyBatchCostsToSaleLines(PosSaleLine original,
                                            List<InventoryService.BatchCostAllocation> allocations) {
        if (allocations == null || allocations.isEmpty()) {
            return;
        }
        BigDecimal remainingLineTotal = original.getLineTotal().setScale(2, RoundingMode.HALF_UP);
        for (int i = 0; i < allocations.size(); i++) {
            InventoryService.BatchCostAllocation allocation = allocations.get(i);
            BigDecimal qty = allocation.quantity().setScale(4, RoundingMode.HALF_UP);
            BigDecimal computedLineTotal = original.getUnitPrice().multiply(qty).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotalForRow = i == allocations.size() - 1 ? remainingLineTotal : computedLineTotal;
            remainingLineTotal = remainingLineTotal.subtract(lineTotalForRow).setScale(2, RoundingMode.HALF_UP);
            if (i == 0) {
                original.setInventoryBatchId(allocation.inventoryBatchId());
                original.setCostPrice(allocation.costPrice());
                original.setQuantity(qty);
                original.setLineTotal(lineTotalForRow);
                saleLineRepository.save(original);
                continue;
            }
            PosSaleLine row = new PosSaleLine();
            row.setId(UUID.randomUUID());
            row.setTenantId(original.getTenantId());
            row.setSalesOrderId(original.getSalesOrderId());
            row.setCatalogItemId(original.getCatalogItemId());
            row.setBarcodeSnapshot(original.getBarcodeSnapshot());
            row.setProductNameSnapshot(original.getProductNameSnapshot());
            row.setUnitPrice(original.getUnitPrice());
            row.setInventoryBatchId(allocation.inventoryBatchId());
            row.setCostPrice(allocation.costPrice());
            row.setQuantity(qty);
            row.setLineTotal(lineTotalForRow);
            saleLineRepository.save(row);
        }
    }

    private UUID resolveOpenTillSessionId(UUID tenant) {
        UUID userId = TenantContext.userId();
        if (userId == null) {
            return null;
        }
        return tillSessionRepository.findByTenantIdAndCashierIdAndStatus(tenant, userId, "OPEN")
            .map(TillSession::getId)
            .orElse(null);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }

    private static boolean hasAnyAuthority(String... authorities) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        for (var g : auth.getAuthorities()) {
            for (String wanted : authorities) {
                if (wanted.equals(g.getAuthority())) {
                    return true;
                }
            }
        }
        return false;
    }
}
