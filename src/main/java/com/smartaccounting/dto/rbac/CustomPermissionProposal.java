package com.smartaccounting.dto.rbac;

import java.util.List;

public record CustomPermissionProposal(
    String code,
    String label,
    String description,
    String category,
    List<String> optionalGrants,
    boolean created
) {
}
