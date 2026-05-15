package com.smartaccounting.dto;

public record EbmApiResponse(
    String receiptNumber,
    String signature,
    String invoiceNumber
) {}
