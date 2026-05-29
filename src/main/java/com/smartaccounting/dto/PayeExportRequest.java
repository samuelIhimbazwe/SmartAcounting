package com.smartaccounting.dto;

import java.util.UUID;

public record PayeExportRequest(UUID runId, String period) {}
