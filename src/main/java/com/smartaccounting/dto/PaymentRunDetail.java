package com.smartaccounting.dto;

import com.smartaccounting.entity.PaymentRun;
import com.smartaccounting.entity.PaymentRunLine;

import java.util.List;

public record PaymentRunDetail(
    PaymentRun run,
    List<PaymentRunLine> lines
) {}
