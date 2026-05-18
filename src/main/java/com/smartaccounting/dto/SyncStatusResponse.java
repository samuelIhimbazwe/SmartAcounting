package com.smartaccounting.dto;

import java.time.Instant;

public record SyncStatusResponse(
    long pendingApprovals,
    long unreadAlerts,
    long lastServerEventId,
    Instant serverTime
) {}
