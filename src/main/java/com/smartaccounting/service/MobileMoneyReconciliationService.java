package com.smartaccounting.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.MobileMoneyCallbackRequest;
import com.smartaccounting.entity.MobileMoneySettlementDedup;
import com.smartaccounting.entity.PosPaymentTender;
import com.smartaccounting.entity.ReconciliationMatchItem;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.repository.MobileMoneySettlementDedupRepository;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.ReconciliationMatchItemRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import com.smartaccounting.config.MobileMoneyProperties;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

@Service
public class MobileMoneyReconciliationService {

    public static final String PROVIDER_MTN = "MTN";
    public static final String PROVIDER_AIRTEL = "AIRTEL";

    private final PosPaymentTenderRepository tenderRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final MobileMoneySettlementDedupRepository dedupRepository;
    private final ReconciliationMatchItemRepository reconciliationMatchItemRepository;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;
    private final MobileMoneyProperties mobileMoneyProperties;

    public MobileMoneyReconciliationService(PosPaymentTenderRepository tenderRepository,
                                            SalesOrderRepository salesOrderRepository,
                                            MobileMoneySettlementDedupRepository dedupRepository,
                                            ReconciliationMatchItemRepository reconciliationMatchItemRepository,
                                            ObjectMapper objectMapper,
                                            AuditService auditService,
                                            MobileMoneyProperties mobileMoneyProperties) {
        this.tenderRepository = tenderRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.dedupRepository = dedupRepository;
        this.reconciliationMatchItemRepository = reconciliationMatchItemRepository;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
        this.mobileMoneyProperties = mobileMoneyProperties;
    }

    @Transactional
    public Map<String, Object> settle(String provider, MobileMoneyCallbackRequest req) {
        UUID tenantId = req.tenantId();
        String externalId = req.transactionId().trim();
        TenantContext.set(tenantId, mobileMoneyProperties.getWebhookActorUserId());
        try {
            Optional<MobileMoneySettlementDedup> cached = dedupRepository.findByTenantIdAndProviderAndExternalId(
                tenantId, provider, externalId);
            if (cached.isPresent()) {
                return wrapReplay(parseCachedResponse(cached.get()));
            }

            List<String> tenderTypes = tenderTypes(provider);
            Optional<PosPaymentTender> tenderOpt = tenderRepository
                .findFirstByTenantIdAndTenderTypeInAndReferenceEqualsIgnoreCaseOrderByCreatedAtDesc(
                    tenantId, tenderTypes, externalId);

            Map<String, Object> response;
            if (tenderOpt.isEmpty()) {
                Map<String, Object> notFound = baseResponse(provider, externalId, "NOT_FOUND", null, null);
                registerUnmatchedCallback(tenantId, provider, externalId, req.amount());
                persistDedup(provider, req, notFound);
                return notFound;
            }

            PosPaymentTender tender = tenderOpt.get();
            SalesOrder order = salesOrderRepository.findById(tender.getSalesOrderId())
                .orElseThrow(() -> new IllegalStateException("Sales order missing for tender"));
            if (req.phoneNumber() != null && !req.phoneNumber().isBlank()) {
                tender.setPayerPhone(req.phoneNumber().trim());
            }

            String currency = req.currencyCode().trim().toUpperCase(Locale.ROOT);
            if (!order.getCurrencyCode().equalsIgnoreCase(currency)) {
                response = mismatchResponse(provider, externalId, tender, "CURRENCY_MISMATCH");
            } else {
                BigDecimal expected = tender.getAmount().setScale(2, RoundingMode.HALF_UP);
                BigDecimal actual = req.amount().setScale(2, RoundingMode.HALF_UP);
                if (expected.compareTo(actual) != 0) {
                    response = mismatchResponse(provider, externalId, tender, "AMOUNT_MISMATCH");
                } else {
                    Instant now = Instant.now();
                    tender.setReconciliationStatus("RECONCILED");
                    tender.setReconciledAt(now);
                    tender.setReconciliationSource(webhookSource(provider));
                    tenderRepository.save(tender);

                    response = baseResponse(provider, externalId, "MATCHED", tender.getId(), order.getId());
                    auditService.logAction(
                        "POS_MOBILE_MONEY_RECONCILED",
                        "POS_PAYMENT_TENDER",
                        "{}",
                        "{\"tenderId\":\"" + tender.getId() + "\",\"provider\":\"" + provider + "\"}"
                    );
                }
            }

            try {
                persistDedup(provider, req, response);
            } catch (DataIntegrityViolationException race) {
                Optional<MobileMoneySettlementDedup> again = dedupRepository.findByTenantIdAndProviderAndExternalId(
                    tenantId, provider, externalId);
                if (again.isPresent()) {
                    return wrapReplay(parseCachedResponse(again.get()));
                }
                throw race;
            }
            return response;
        } finally {
            TenantContext.clear();
        }
    }

    private List<String> tenderTypes(String provider) {
        return switch (provider) {
            case PROVIDER_MTN -> List.of("MOMO");
            case PROVIDER_AIRTEL -> List.of("AIRTEL_MONEY");
            default -> throw new IllegalArgumentException("Unsupported mobile money provider: " + provider);
        };
    }

    private static String webhookSource(String provider) {
        return switch (provider) {
            case PROVIDER_MTN -> "WEBHOOK_MTN";
            case PROVIDER_AIRTEL -> "WEBHOOK_AIRTEL";
            default -> "WEBHOOK_" + provider;
        };
    }

    private Map<String, Object> mismatchResponse(String provider, String externalId, PosPaymentTender tender, String reason) {
        tender.setReconciliationStatus("MISMATCH");
        tender.setReconciledAt(Instant.now());
        tender.setReconciliationSource(webhookSource(provider));
        tenderRepository.save(tender);

        Map<String, Object> m = baseResponse(provider, externalId, "MISMATCH", tender.getId(),
            tender.getSalesOrderId());
        m.put("reason", reason);
        return m;
    }

    private Map<String, Object> baseResponse(String provider, String externalId, String outcome,
                                             UUID tenderId, UUID salesOrderId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("provider", provider);
        m.put("transactionId", externalId);
        m.put("outcome", outcome);
        if (tenderId != null) {
            m.put("posPaymentTenderId", tenderId.toString());
        }
        if (salesOrderId != null) {
            m.put("salesOrderId", salesOrderId.toString());
        }
        m.put("replay", false);
        return m;
    }

    private Map<String, Object> wrapReplay(Map<String, Object> parsed) {
        Map<String, Object> m = new LinkedHashMap<>(parsed);
        m.put("replay", true);
        return m;
    }

    private Map<String, Object> parseCachedResponse(MobileMoneySettlementDedup row) {
        try {
            return objectMapper.readValue(row.getResponseJson(), new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Failed to read cached settlement response", e);
        }
    }

    private void persistDedup(String provider, MobileMoneyCallbackRequest req, Map<String, Object> response) {
        MobileMoneySettlementDedup row = new MobileMoneySettlementDedup();
        row.setId(UUID.randomUUID());
        row.setTenantId(req.tenantId());
        row.setProvider(provider);
        row.setExternalId(req.transactionId().trim());
        row.setOutcome(String.valueOf(response.get("outcome")));
        try {
            row.setResponseJson(objectMapper.writeValueAsString(stripReplayFlag(response)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize settlement response", e);
        }
        row.setCreatedAt(Instant.now());
        dedupRepository.save(row);
    }

    /** Persist without replay flag so cached payload is stable. */
    private Map<String, Object> stripReplayFlag(Map<String, Object> response) {
        Map<String, Object> copy = new LinkedHashMap<>(response);
        copy.remove("replay");
        copy.put("replay", false);
        return copy;
    }

    private void registerUnmatchedCallback(UUID tenantId, String provider, String externalId, BigDecimal amount) {
        UUID itemId = UUID.nameUUIDFromBytes(
            ("mobile-money-unmatched:" + provider + ":" + externalId).getBytes(StandardCharsets.UTF_8)
        );
        if (reconciliationMatchItemRepository.existsByTenantIdAndItemTypeAndItemIdAndMatchedFalse(
            tenantId, "MOBILE_MONEY_CALLBACK", itemId)) {
            return;
        }
        ReconciliationMatchItem item = new ReconciliationMatchItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(tenantId);
        item.setItemType("MOBILE_MONEY_CALLBACK");
        item.setItemId(itemId);
        item.setAmount(amount);
        item.setMatched(false);
        item.setCreatedAt(Instant.now());
        reconciliationMatchItemRepository.save(item);
    }
}
