package com.smartaccounting.dto;

import com.smartaccounting.entity.PayrollLine;
import com.smartaccounting.entity.PayrollRun;

import java.util.List;

public record PayrollRunDetail(PayrollRun run, List<PayrollLine> lines) {}
