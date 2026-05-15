package com.smartaccounting.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dto.MobileMoneyCallbackRequest;
import com.smartaccounting.entity.PosPaymentTender;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Accepts MTN MoMo / Airtel Money provider payloads (and our canonical JSON) and produces
 * {@link MobileMoneyCallbackRequest} for reconciliation.
 * <p>
 * Register operator callback URL including tenant, e.g.
 * {@code POST https://host/api/v1/integrations/mobile-money/mtn/callback?tenantId=<uuid>}
 * </p>
 */
@Service
public class MobileMoneyIngressService {

    private static final Set<String> SUCCESS_STATUSES = Set.of(
        "SUCCESSFUL", "SUCCESS", "COMPLETED", "COMPLETE", "TS", "TP", "APPROVED", "SUCCEEDED"
    );

    private final ObjectMapper objectMapper;
    private final PosPaymentTenderRepository tenderRepository;
    private final SalesOrderRepository salesOrderRepository;

    public MobileMoneyIngressService(ObjectMapper objectMapper,
                                     PosPaymentTenderRepository tenderRepository,
                                     SalesOrderRepository salesOrderRepository) {
        this.objectMapper = objectMapper;
        this.tenderRepository = tenderRepository;
        this.salesOrderRepository = salesOrderRepository;
    }

    /**
     * @param tenantQuery optional tenant when operator callback cannot include tenant in body
     */
    public IngressOutcome parse(String provider, JsonNode root, UUID tenantQuery) {
        if (looksCanonical(root)) {
            try {
                MobileMoneyCallbackRequest req = objectMapper.treeToValue(root, MobileMoneyCallbackRequest.class);
                return IngressOutcome.proceed(req);
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid canonical callback JSON: " + e.getMessage());
            }
        }

        UUID tenant = resolveTenant(root, tenantQuery);
        if (tenant == null) {
            throw new IllegalArgumentException(
                "tenantId is required: put it in the JSON body or add query parameter ?tenantId=<uuid>");
        }

        Optional<String> status = readStatus(root);
        if (status.isPresent() && !isSuccessStatus(status.get())) {
            return IngressOutcome.skipped("NON_SUCCESS_STATUS:" + status.get());
        }

        String txnId = resolveTransactionId(root);
        if (txnId == null || txnId.isBlank()) {
            throw new IllegalArgumentException(
                "Could not resolve transaction id (expected financialTransactionId, transactionId, referenceId, …)");
        }
        txnId = txnId.trim();

        BigDecimal amount = resolveAmount(root);
        String currency = resolveCurrency(root);

        String phoneNumber = resolvePhoneNumber(root);
        if (amount != null && currency != null && !currency.isBlank()) {
            return IngressOutcome.proceed(new MobileMoneyCallbackRequest(tenant, txnId, amount, currency.trim(), phoneNumber));
        }

        MobileMoneyCallbackRequest inferred = inferFromPos(provider, tenant, txnId, phoneNumber);
        return IngressOutcome.proceed(inferred);
    }

    private static boolean looksCanonical(JsonNode root) {
        return root != null && root.isObject()
            && root.hasNonNull("tenantId")
            && root.hasNonNull("transactionId")
            && root.has("amount")
            && root.hasNonNull("currencyCode");
    }

    private static UUID resolveTenant(JsonNode root, UUID tenantQuery) {
        if (tenantQuery != null) {
            return tenantQuery;
        }
        JsonNode t = root.get("tenantId");
        if (t != null && !t.isNull() && t.isTextual()) {
            try {
                return UUID.fromString(t.asText());
            } catch (IllegalArgumentException ignored) {
                return null;
            }
        }
        return null;
    }

    private static Optional<String> readStatus(JsonNode root) {
        String s = firstText(root,
            "status",
            "transactionStatus",
            "/data/status",
            "/transaction/status",
            "/data/transaction/status");
        return Optional.ofNullable(s);
    }

    private static boolean isSuccessStatus(String raw) {
        String u = raw.trim().toUpperCase(Locale.ROOT);
        return SUCCESS_STATUSES.contains(u);
    }

    /**
     * MTN MoMo uses referenceId / financialTransactionId; Airtel responses often nest under data.transaction.
     */
    private static String resolveTransactionId(JsonNode root) {
        return firstText(root,
            "financialTransactionId",
            "transactionId",
            "transactionReference",
            "referenceId",
            "reference_id",
            "externalId",
            "/data/financialTransactionId",
            "/data/referenceId",
            "/data/transactionId",
            "/data/transaction/id",
            "/transaction/id",
            "/jsondata/data/transaction/id");
    }

    private static BigDecimal resolveAmount(JsonNode root) {
        BigDecimal n = firstDecimal(root, "amount", "/data/amount", "/transaction/amount", "/data/transaction/amount");
        if (n != null) {
            return n;
        }
        JsonNode money = root.path("data").path("transaction").path("money");
        if (!money.isMissingNode()) {
            return parseDecimal(money.get("amount"));
        }
        return null;
    }

    private static String resolveCurrency(JsonNode root) {
        String c = firstText(root,
            "currencyCode",
            "currency",
            "/data/currency",
            "/transaction/currency",
            "/data/transaction/currency");
        if (c != null) {
            return c;
        }
        JsonNode money = root.path("data").path("transaction").path("money");
        if (!money.isMissingNode()) {
            String cc = textOrNull(money.get("currency"));
            if (cc != null) {
                return cc;
            }
        }
        return null;
    }

    private static String resolvePhoneNumber(JsonNode root) {
        return firstText(root,
            "phoneNumber",
            "payerPhone",
            "msisdn",
            "/data/phoneNumber",
            "/data/payerPhone",
            "/data/msisdn",
            "/data/transaction/payer/msisdn",
            "/data/transaction/msisdn");
    }

    private MobileMoneyCallbackRequest inferFromPos(String provider, UUID tenantId, String transactionId, String phoneNumber) {
        List<String> types = tenderTypes(provider);
        Optional<PosPaymentTender> tenderOpt = tenderRepository
            .findFirstByTenantIdAndTenderTypeInAndReferenceEqualsIgnoreCaseOrderByCreatedAtDesc(
                tenantId, types, transactionId);
        if (tenderOpt.isEmpty()) {
            throw new IllegalArgumentException(
                "amount/currency not in callback and no POS tender matched reference '" + transactionId + "'");
        }
        PosPaymentTender tender = tenderOpt.get();
        SalesOrder order = salesOrderRepository.findById(tender.getSalesOrderId())
            .orElseThrow(() -> new IllegalStateException("Sales order missing for tender"));
        return new MobileMoneyCallbackRequest(
            tenantId,
            transactionId,
            tender.getAmount(),
            order.getCurrencyCode(),
            phoneNumber
        );
    }

    private static List<String> tenderTypes(String provider) {
        return switch (provider) {
            case MobileMoneyReconciliationService.PROVIDER_MTN -> List.of("MOMO");
            case MobileMoneyReconciliationService.PROVIDER_AIRTEL -> List.of("AIRTEL_MONEY");
            default -> throw new IllegalArgumentException("Unsupported provider: " + provider);
        };
    }

    /**
     * Plain names use {@link JsonNode#get(String)}; values starting with "/" use {@link JsonNode#at(String)} (JSON Pointer).
     */
    private static String firstText(JsonNode root, String... keys) {
        for (String key : keys) {
            if (key == null) {
                continue;
            }
            JsonNode n = key.startsWith("/") ? root.at(key) : root.get(key);
            String t = textOrNull(n);
            if (t != null && !t.isBlank()) {
                return t.trim();
            }
        }
        return null;
    }

    private static BigDecimal firstDecimal(JsonNode root, String key, String altPath, String alt2, String alt3) {
        BigDecimal a = parseDecimal(root.get(key));
        if (a != null) {
            return a;
        }
        if (altPath != null) {
            a = parseDecimal(root.at(altPath));
            if (a != null) {
                return a;
            }
        }
        if (alt2 != null) {
            a = parseDecimal(root.at(alt2));
            if (a != null) {
                return a;
            }
        }
        if (alt3 != null) {
            return parseDecimal(root.at(alt3));
        }
        return null;
    }

    private static BigDecimal parseDecimal(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) {
            return null;
        }
        if (n.isNumber()) {
            return n.decimalValue();
        }
        if (n.isTextual()) {
            try {
                String s = n.asText().trim();
                if (s.isEmpty()) {
                    return null;
                }
                return new BigDecimal(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static String textOrNull(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) {
            return null;
        }
        if (n.isTextual()) {
            String s = n.asText();
            return s.isBlank() ? null : s;
        }
        if (n.isNumber()) {
            return n.asText();
        }
        return null;
    }

    public record IngressOutcome(MobileMoneyCallbackRequest request, boolean skipped, String skipReason) {
        public static IngressOutcome proceed(MobileMoneyCallbackRequest request) {
            return new IngressOutcome(request, false, null);
        }

        public static IngressOutcome skipped(String reason) {
            return new IngressOutcome(null, true, reason);
        }
    }
}
