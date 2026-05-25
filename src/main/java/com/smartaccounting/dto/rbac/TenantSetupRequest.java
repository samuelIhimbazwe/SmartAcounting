package com.smartaccounting.dto.rbac;

import com.smartaccounting.entity.BusinessSize;
import com.smartaccounting.entity.BusinessType;

import java.util.List;

public record TenantSetupRequest(
    BusinessSize size,
    BusinessType type,
    List<RoleSetupItem> roles
) {}
