package com.smartaccounting.controller;

import com.smartaccounting.service.PosReceiptService;
import com.smartaccounting.service.SmsDispatchService;
import com.smartaccounting.service.WhatsAppBroadcastService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Mobile receipt delivery (WhatsApp Business API / SMS fallback).
 * WHATSAPP_API_TODO / SMS_API_TODO: wire production credentials in application.yml.
 */
@RestController
@RequestMapping("/api/v1/pos/receipts")
public class MobileReceiptController {

    private final PosReceiptService posReceiptService;
    private final WhatsAppBroadcastService whatsAppBroadcastService;
    private final SmsDispatchService smsDispatchService;

    public MobileReceiptController(
            PosReceiptService posReceiptService,
            WhatsAppBroadcastService whatsAppBroadcastService,
            SmsDispatchService smsDispatchService) {
        this.posReceiptService = posReceiptService;
        this.whatsAppBroadcastService = whatsAppBroadcastService;
        this.smsDispatchService = smsDispatchService;
    }

    @PostMapping("/{salesOrderId}/deliver")
    public Map<String, Object> deliver(
            @PathVariable UUID salesOrderId,
            @RequestBody Map<String, Object> body) {
        String channel = String.valueOf(body.getOrDefault("channel", "WHATSAPP")).toUpperCase();
        String phone = String.valueOf(body.getOrDefault("phone", "")).trim();
        String message = String.valueOf(body.getOrDefault("message", "")).trim();

        if (phone.isBlank()) {
            return Map.of("ok", false, "message", "Phone number is required");
        }

        Map<String, Object> receipt = posReceiptService.print(salesOrderId, false);
        if (message.isBlank()) {
            Object text = receipt.get("receiptText");
            message = text != null ? String.valueOf(text) : "Thank you for your purchase.";
        }

        UUID tenant = TenantContext.tenantId();
        boolean sent;
        if ("SMS".equals(channel)) {
            int count = smsDispatchService.send(
                    tenant, salesOrderId, "POS_RECEIPT", List.of(phone), message);
            sent = count > 0;
        } else {
            sent = whatsAppBroadcastService.send(tenant, "POS_RECEIPT", phone, message);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", sent);
        out.put("channel", channel);
        out.put("salesOrderId", salesOrderId.toString());
        out.put("message", sent ? "Receipt sent" : "Delivery failed (check API configuration)");
        return out;
    }
}
