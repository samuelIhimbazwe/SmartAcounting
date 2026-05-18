package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.config.LabelProperties;
import com.smartaccounting.config.PosProperties;
import com.smartaccounting.dto.BarcodeLabelBatchItemRequest;
import com.smartaccounting.dto.CreateProductRequest;
import com.smartaccounting.dto.PosTillCloseRequest;
import com.smartaccounting.entity.InventoryBatch;
import com.smartaccounting.entity.PosCatalogItem;
import com.smartaccounting.entity.PosTillClose;
import com.smartaccounting.entity.Product;
import com.smartaccounting.repository.InventoryBatchRepository;
import com.smartaccounting.repository.PosCatalogItemRepository;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.PosTillCloseRepository;
import com.smartaccounting.repository.ProductRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RetailOpsService {

    private final ProductRepository productRepository;
    private final PosCatalogItemRepository posCatalogItemRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final PosPaymentTenderRepository posPaymentTenderRepository;
    private final PosTillCloseRepository posTillCloseRepository;
    private final CurrencyService currencyService;
    private final PosProperties posProperties;
    private final LabelProperties labelProperties;
    private final AuditService auditService;
    private final PushNotificationService pushNotificationService;

    public RetailOpsService(ProductRepository productRepository,
                            PosCatalogItemRepository posCatalogItemRepository,
                            InventoryBatchRepository inventoryBatchRepository,
                            PosPaymentTenderRepository posPaymentTenderRepository,
                            PosTillCloseRepository posTillCloseRepository,
                            CurrencyService currencyService,
                            PosProperties posProperties,
                            LabelProperties labelProperties,
                            AuditService auditService,
                            PushNotificationService pushNotificationService) {
        this.productRepository = productRepository;
        this.posCatalogItemRepository = posCatalogItemRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.posPaymentTenderRepository = posPaymentTenderRepository;
        this.posTillCloseRepository = posTillCloseRepository;
        this.currencyService = currencyService;
        this.posProperties = posProperties;
        this.labelProperties = labelProperties;
        this.auditService = auditService;
        this.pushNotificationService = pushNotificationService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listProducts() {
        UUID tenant = requireTenant();
        return productRepository.findByTenantIdOrderByNameAsc(tenant).stream()
            .map(this::productMap)
            .collect(Collectors.toList());
    }

    @Transactional
    public UUID createProduct(CreateProductRequest req) {
        UUID tenant = requireTenant();
        Product p = new Product();
        p.setId(UUID.randomUUID());
        p.setTenantId(tenant);
        p.setName(req.name().trim());
        p.setSku(req.sku() != null ? req.sku().trim() : null);
        p.setUnit(req.unit() != null ? req.unit().trim() : null);
        p.setCreatedAt(Instant.now());
        productRepository.save(p);
        auditService.logAction("PRODUCT_CREATED", "PRODUCT", "{}", "{\"id\":\"" + p.getId() + "\"}");
        return p.getId();
    }

    @Transactional
    public Map<String, Object> productBarcodeLabel(UUID productId) {
        UUID tenant = requireTenant();
        Product product = productRepository.findByIdAndTenantId(productId, tenant)
            .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        String barcode = ensureBarcode(product);
        LabelContext ctx = resolveLabelContext(tenant, product);
        return toLabelPayload(product, barcode, ctx.priceFrw(), ctx.expiryDate());
    }

    @Transactional
    public Map<String, Object> productBarcodeLabelBatch(List<BarcodeLabelBatchItemRequest> requests) {
        UUID tenant = requireTenant();
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("At least one batch item is required");
        }
        int total = 0;
        List<Map<String, Object>> jobs = requests.stream()
            .map(req -> {
                Product product = productRepository.findByIdAndTenantId(req.productId(), tenant)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + req.productId()));
                String barcode = ensureBarcode(product);
                LabelContext ctx = resolveLabelContext(tenant, product);
                Map<String, Object> one = toLabelPayload(product, barcode, ctx.priceFrw(), ctx.expiryDate());
                one.put("quantity", req.quantity());
                return one;
            })
            .collect(Collectors.toList());
        for (BarcodeLabelBatchItemRequest req : requests) {
            total += req.quantity();
        }
        return Map.of(
            "printerType", normalizeLabelPrinterType(labelProperties.getPrinterType()),
            "totalLabels", total,
            "jobs", jobs
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> expectedTill(LocalDate businessDate, String posRegisterCode) {
        requireTenant();
        return buildSystemTotalsMap(businessDate, posRegisterCode.trim());
    }

    @Transactional
    public Map<String, Object> closeTill(PosTillCloseRequest req) {
        UUID tenant = requireTenant();
        String reg = req.posRegisterCode().trim();
        if (posTillCloseRepository.findByTenantIdAndBusinessDateAndPosRegisterCode(tenant, req.businessDate(), reg).isPresent()) {
            throw new IllegalArgumentException("Till already closed for this date and register");
        }
        Map<String, BigDecimal> sys = loadSystemTotals(req.businessDate(), reg);
        BigDecimal cCash = req.countedCash().setScale(2, RoundingMode.HALF_UP);
        BigDecimal cMomo = req.countedMomo().setScale(2, RoundingMode.HALF_UP);
        BigDecimal cAirtel = req.countedAirtel().setScale(2, RoundingMode.HALF_UP);
        BigDecimal cCard = req.countedCard().setScale(2, RoundingMode.HALF_UP);
        BigDecimal cOA = req.countedOnAccount().setScale(2, RoundingMode.HALF_UP);

        PosTillClose row = new PosTillClose();
        row.setId(UUID.randomUUID());
        row.setTenantId(tenant);
        row.setBusinessDate(req.businessDate());
        row.setPosRegisterCode(reg);
        row.setCountedCash(cCash);
        row.setCountedMomo(cMomo);
        row.setCountedAirtel(cAirtel);
        row.setCountedCard(cCard);
        row.setCountedOnAccount(cOA);

        row.setSystemCash(sys.get("CASH"));
        row.setSystemMomo(sys.get("MOMO"));
        row.setSystemAirtel(sys.get("AIRTEL_MONEY"));
        row.setSystemCard(sys.get("CARD"));
        row.setSystemOnAccount(sys.get("ON_ACCOUNT"));

        row.setVarianceCash(cCash.subtract(row.getSystemCash()));
        row.setVarianceMomo(cMomo.subtract(row.getSystemMomo()));
        row.setVarianceAirtel(cAirtel.subtract(row.getSystemAirtel()));
        row.setVarianceCard(cCard.subtract(row.getSystemCard()));
        row.setVarianceOnAccount(cOA.subtract(row.getSystemOnAccount()));

        row.setNotes(req.notes());
        row.setClosedAt(Instant.now());

        try {
            posTillCloseRepository.save(row);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Till already closed for this date and register");
        }

        auditService.logAction("POS_TILL_CLOSED", "POS_TILL_CLOSE", "{}", "{\"id\":\"" + row.getId() + "\"}");

        BigDecimal totalVariance = row.getVarianceCash().abs()
            .add(row.getVarianceMomo().abs())
            .add(row.getVarianceAirtel().abs())
            .add(row.getVarianceCard().abs())
            .add(row.getVarianceOnAccount().abs());
        if (totalVariance.compareTo(new BigDecimal("0.01")) > 0) {
            pushNotificationService.sendToRole(
                tenant.toString(),
                "ACCOUNTING_CONTROLLER",
                "Till Variance",
                "Till " + reg + " has a variance of "
                    + totalVariance.setScale(2, RoundingMode.HALF_UP).toPlainString() + " FRW",
                Map.of(
                    "type", "TILL_VARIANCE",
                    "route", "/till"
                )
            );
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tillCloseId", row.getId());
        out.put("businessDate", req.businessDate().toString());
        out.put("posRegisterCode", reg);
        out.put("system", Map.of(
            "cash", row.getSystemCash(),
            "momo", row.getSystemMomo(),
            "airtelMoney", row.getSystemAirtel(),
            "card", row.getSystemCard(),
            "onAccount", row.getSystemOnAccount()
        ));
        out.put("counted", Map.of(
            "cash", cCash,
            "momo", cMomo,
            "airtelMoney", cAirtel,
            "card", cCard,
            "onAccount", cOA
        ));
        out.put("variance", Map.of(
            "cash", row.getVarianceCash(),
            "momo", row.getVarianceMomo(),
            "airtelMoney", row.getVarianceAirtel(),
            "card", row.getVarianceCard(),
            "onAccount", row.getVarianceOnAccount()
        ));
        return out;
    }

    private Map<String, Object> buildSystemTotalsMap(LocalDate businessDate, String register) {
        Map<String, BigDecimal> sys = loadSystemTotals(businessDate, register);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("businessDate", businessDate.toString());
        m.put("posRegisterCode", register);
        m.put("cash", sys.get("CASH"));
        m.put("momo", sys.get("MOMO"));
        m.put("airtelMoney", sys.get("AIRTEL_MONEY"));
        m.put("card", sys.get("CARD"));
        m.put("onAccount", sys.get("ON_ACCOUNT"));
        return m;
    }

    private Map<String, BigDecimal> loadSystemTotals(LocalDate businessDate, String register) {
        UUID tenant = requireTenant();
        ZoneId zone = ZoneId.of(posProperties.getBusinessTimeZone());
        ZonedDateTime startZ = businessDate.atStartOfDay(zone);
        Instant start = startZ.toInstant();
        Instant end = businessDate.plusDays(1).atStartOfDay(zone).toInstant();

        Map<String, BigDecimal> m = new LinkedHashMap<>();
        m.put("CASH", sum(tenant, "CASH", start, end, register));
        m.put("MOMO", sum(tenant, "MOMO", start, end, register));
        m.put("AIRTEL_MONEY", sum(tenant, "AIRTEL_MONEY", start, end, register));
        m.put("CARD", sum(tenant, "CARD", start, end, register));
        m.put("ON_ACCOUNT", sum(tenant, "ON_ACCOUNT", start, end, register));
        return m;
    }

    private BigDecimal sum(UUID tenant, String tenderType, Instant start, Instant end, String register) {
        BigDecimal v = posPaymentTenderRepository.sumTenderForRegisterDay(tenant, tenderType, start, end, register);
        return v != null ? v.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private Map<String, Object> productMap(Product p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("productId", p.getId());
        m.put("name", p.getName());
        m.put("sku", p.getSku());
        m.put("unit", p.getUnit());
        m.put("barcode", p.getBarcode());
        return m;
    }

    private String ensureBarcode(Product product) {
        if (product.getBarcode() != null && !product.getBarcode().isBlank()) {
            return product.getBarcode().trim();
        }
        UUID tenant = product.getTenantId();
        String candidate;
        do {
            candidate = "SC" + System.currentTimeMillis() + Math.abs(UUID.randomUUID().getMostSignificantBits() % 10000);
        } while (productRepository.existsByTenantIdAndBarcode(tenant, candidate));
        product.setBarcode(candidate);
        productRepository.save(product);
        auditService.logAction("PRODUCT_BARCODE_ASSIGNED", "PRODUCT", "{}", "{\"id\":\"" + product.getId() + "\",\"barcode\":\"" + candidate + "\"}");
        return candidate;
    }

    private LabelContext resolveLabelContext(UUID tenant, Product product) {
        Optional<PosCatalogItem> catalogItem = posCatalogItemRepository
            .findFirstByTenantIdAndProductIdAndActiveTrueOrderByCreatedAtDesc(tenant, product.getId());
        BigDecimal priceFrw = null;
        if (catalogItem.isPresent()) {
            PosCatalogItem item = catalogItem.get();
            BigDecimal unit = item.getUnitPrice().setScale(2, RoundingMode.HALF_UP);
            String cur = item.getCurrencyCode().toUpperCase(Locale.ROOT);
            priceFrw = "RWF".equals(cur) ? unit : currencyService.convertAmount(unit, cur, "RWF").setScale(2, RoundingMode.HALF_UP);
        }
        Optional<InventoryBatch> earliestExpiry = inventoryBatchRepository
            .findFirstByTenantIdAndProductIdAndExpiryDateIsNotNullOrderByExpiryDateAscCreatedAtAsc(tenant, product.getId());
        return new LabelContext(priceFrw, earliestExpiry.map(InventoryBatch::getExpiryDate).orElse(null));
    }

    private Map<String, Object> toLabelPayload(Product product, String barcode, BigDecimal priceFrw, LocalDate expiryDate) {
        String pngB64 = generateBarcodePngBase64(barcode);
        String labelHtml = buildLabelHtml(product.getName(), barcode, priceFrw, expiryDate, pngB64);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("productId", product.getId());
        out.put("productName", product.getName());
        out.put("barcode", barcode);
        out.put("priceFrw", priceFrw != null ? priceFrw : "");
        out.put("expiryDate", expiryDate != null ? expiryDate.toString() : "");
        out.put("printerType", normalizeLabelPrinterType(labelProperties.getPrinterType()));
        out.put("barcodePngBase64", pngB64);
        out.put("labelHtml", labelHtml);
        return out;
    }

    private String buildLabelHtml(String productName, String barcode, BigDecimal priceFrw, LocalDate expiryDate, String pngB64) {
        String price = priceFrw != null ? priceFrw.setScale(2, RoundingMode.HALF_UP).toPlainString() + " FRW" : "N/A";
        String expiry = expiryDate != null ? expiryDate.toString() : "N/A";
        return "<div style=\"width:320px;border:1px solid #333;padding:10px;font-family:Arial,sans-serif;\">"
            + "<div style=\"font-weight:700;font-size:14px;margin-bottom:4px;\">" + escapeHtml(productName) + "</div>"
            + "<img alt=\"barcode\" style=\"width:300px;height:80px;display:block;\" src=\"data:image/png;base64," + pngB64 + "\"/>"
            + "<div style=\"font-size:12px;margin-top:4px;\">Barcode: " + escapeHtml(barcode) + "</div>"
            + "<div style=\"font-size:12px;\">Price: " + escapeHtml(price) + "</div>"
            + "<div style=\"font-size:12px;\">Expiry: " + escapeHtml(expiry) + "</div>"
            + "</div>";
    }

    private static String generateBarcodePngBase64(String barcode) {
        try {
            BitMatrix matrix = new com.google.zxing.MultiFormatWriter()
                .encode(barcode, BarcodeFormat.CODE_128, 320, 80);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (WriterException | java.io.IOException e) {
            throw new IllegalStateException("Failed to generate barcode label", e);
        }
    }

    private static String normalizeLabelPrinterType(String raw) {
        String p = raw == null ? "thermal-label" : raw.trim().toLowerCase(Locale.ROOT);
        return switch (p) {
            case "thermal-label", "pdf", "a4-sheet" -> p;
            default -> "thermal-label";
        };
    }

    private static String escapeHtml(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private record LabelContext(BigDecimal priceFrw, LocalDate expiryDate) {}

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
