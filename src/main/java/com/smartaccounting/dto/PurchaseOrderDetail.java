package com.smartaccounting.dto;

import com.smartaccounting.entity.PurchaseOrder;
import com.smartaccounting.entity.PurchaseOrderLine;

import java.util.List;

public record PurchaseOrderDetail(PurchaseOrder purchaseOrder, List<PurchaseOrderLine> lines) {}
