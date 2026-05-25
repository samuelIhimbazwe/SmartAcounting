package com.smartaccounting.copilot;

import java.util.List;
import java.util.Map;

public record CopilotActionPlan(
    String type,
    String permissionCode,
    String title,
    String summary,
    Map<String, Object> payload,
    boolean executable,
    List<String> missingFields,
    boolean reversible,
    String warningMessage,
    String undoActionType
) {
}
