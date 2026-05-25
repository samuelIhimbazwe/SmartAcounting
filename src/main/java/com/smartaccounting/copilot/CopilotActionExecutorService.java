package com.smartaccounting.copilot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dto.CreateInvoiceRequest;
import com.smartaccounting.dto.CreateSupplierBillRequest;
import com.smartaccounting.dto.InitiateReturnRequest;
import com.smartaccounting.dto.PosCheckoutRequest;
import com.smartaccounting.dto.WorkflowCreatePurchaseOrderRequest;
import com.smartaccounting.entity.ActionQueueItem;
import com.smartaccounting.entity.GoodsReceivedNote;
import com.smartaccounting.entity.PosReturn;
import com.smartaccounting.entity.PurchaseOrder;
import com.smartaccounting.service.PosCheckoutService;
import com.smartaccounting.service.PosReceiptService;
import com.smartaccounting.service.PurchaseOrderService;
import com.smartaccounting.service.ReceivablesPayablesService;
import com.smartaccounting.service.ReturnsService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class CopilotActionExecutorService {
    private final ObjectMapper objectMapper;
    private final ReceivablesPayablesService receivablesPayablesService;
    private final PosCheckoutService posCheckoutService;
    private final PosReceiptService posReceiptService;
    private final PurchaseOrderService purchaseOrderService;
    private final ReturnsService returnsService;

    public CopilotActionExecutorService(
        ObjectMapper objectMapper,
        ReceivablesPayablesService receivablesPayablesService,
        PosCheckoutService posCheckoutService,
        PosReceiptService posReceiptService,
        PurchaseOrderService purchaseOrderService,
        ReturnsService returnsService
    ) {
        this.objectMapper = objectMapper;
        this.receivablesPayablesService = receivablesPayablesService;
        this.posCheckoutService = posCheckoutService;
        this.posReceiptService = posReceiptService;
        this.purchaseOrderService = purchaseOrderService;
        this.returnsService = returnsService;
    }

    public ExecutionResult execute(ActionQueueItem item) {
        UUID effectiveUserId = item.getApprovalDecidedBy() != null ? item.getApprovalDecidedBy() : item.getRequestedBy();
        TenantContext.set(item.getTenantId(), effectiveUserId);
        try {
            return switch (item.getActionType()) {
                case "CREATE_INVOICE" -> createInvoice(item);
                case "CREATE_SUPPLIER_BILL" -> createSupplierBill(item);
                case "POS_CHECKOUT" -> posCheckout(item);
                case "POS_RECEIPT_REPRINT" -> receiptReprint(item);
                case "CREATE_PURCHASE_ORDER" -> createPurchaseOrder(item);
                case "INITIATE_POS_RETURN" -> initiateReturn(item);
                case "ARCHIVE_INVOICE" -> archiveInvoice(item);
                case "ARCHIVE_SUPPLIER_BILL" -> archiveSupplierBill(item);
                default -> new ExecutionResult("ACTION_QUEUE_ITEM", null, "Action marked processed without a typed executor.", null);
            };
        } finally {
            TenantContext.clear();
        }
    }

    private ExecutionResult createInvoice(ActionQueueItem item) {
        CreateInvoiceRequest request = convertPayload(item, CreateInvoiceRequest.class);
        UUID invoiceId = receivablesPayablesService.createInvoice(request);
        return new ExecutionResult(
            "INVOICE",
            invoiceId,
            "Invoice created for " + request.customerName() + ".",
            Map.of("invoiceId", invoiceId.toString())
        );
    }

    private ExecutionResult createSupplierBill(ActionQueueItem item) {
        CreateSupplierBillRequest request = convertPayload(item, CreateSupplierBillRequest.class);
        UUID billId = receivablesPayablesService.createSupplierBill(request);
        return new ExecutionResult(
            "SUPPLIER_BILL",
            billId,
            "Supplier bill created for " + request.supplierName() + ".",
            Map.of("supplierBillId", billId.toString())
        );
    }

    private ExecutionResult posCheckout(ActionQueueItem item) {
        PosCheckoutRequest request = convertPayload(item, PosCheckoutRequest.class);
        Map<String, Object> result = posCheckoutService.checkout(request);
        UUID salesOrderId = UUID.fromString(String.valueOf(result.get("salesOrderId")));
        return new ExecutionResult(
            "POS_SALE",
            salesOrderId,
            "POS checkout completed.",
            null
        );
    }

    private ExecutionResult receiptReprint(ActionQueueItem item) {
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = objectMapper.convertValue(parsePayload(item.getPayload()), Map.class);
        UUID transactionId = UUID.fromString(String.valueOf(payload.get("transactionId")));
        posReceiptService.print(transactionId, true);
        return new ExecutionResult(
            "POS_RECEIPT",
            transactionId,
            "POS receipt reprinted.",
            null
        );
    }

    private ExecutionResult createPurchaseOrder(ActionQueueItem item) {
        WorkflowCreatePurchaseOrderRequest request = convertPayload(item, WorkflowCreatePurchaseOrderRequest.class);
        PurchaseOrder po = purchaseOrderService.createPurchaseOrder(request, actorId(item));
        return new ExecutionResult(
            "PURCHASE_ORDER",
            po.getId(),
            "Purchase order created.",
            null
        );
    }

    private ExecutionResult initiateReturn(ActionQueueItem item) {
        InitiateReturnRequest request = convertPayload(item, InitiateReturnRequest.class);
        String cashierId = actorId(item) != null ? actorId(item).toString() : "ai-copilot";
        PosReturn posReturn = returnsService.initiateReturn(request, cashierId);
        return new ExecutionResult(
            "POS_RETURN",
            posReturn.getId(),
            "POS return initiated.",
            null
        );
    }

    private ExecutionResult archiveInvoice(ActionQueueItem item) {
        UUID invoiceId = extractEntityId(item.getPayload(), "invoiceId");
        receivablesPayablesService.archiveInvoice(invoiceId);
        return new ExecutionResult(
            "INVOICE",
            invoiceId,
            "Invoice archived by undo.",
            null
        );
    }

    private ExecutionResult archiveSupplierBill(ActionQueueItem item) {
        UUID billId = extractEntityId(item.getPayload(), "supplierBillId");
        receivablesPayablesService.archiveSupplierBill(billId);
        return new ExecutionResult(
            "SUPPLIER_BILL",
            billId,
            "Supplier bill archived by undo.",
            null
        );
    }

    private UUID extractEntityId(String jsonPayload, String key) {
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = objectMapper.convertValue(parsePayload(jsonPayload), Map.class);
        Object raw = payload.get(key);
        if (raw == null) {
            throw new IllegalArgumentException("Missing undo entity id for " + key);
        }
        return UUID.fromString(String.valueOf(raw));
    }

    private UUID actorId(ActionQueueItem item) {
        return item.getApprovalDecidedBy() != null ? item.getApprovalDecidedBy() : item.getRequestedBy();
    }

    private Object parsePayload(String payload) {
        try {
            return objectMapper.readValue(payload == null ? "{}" : payload, Object.class);
        } catch (Exception ex) {
            throw new IllegalStateException("Invalid action payload", ex);
        }
    }

    private <T> T convertPayload(ActionQueueItem item, Class<T> type) {
        return objectMapper.convertValue(parsePayload(item.getPayload()), type);
    }

    public record ExecutionResult(
        String entityType,
        UUID entityId,
        String summary,
        Map<String, Object> undoPayload
    ) {
    }
}
