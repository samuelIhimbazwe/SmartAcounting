package com.smartaccounting.security;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Ensures every {@link PermissionExpressions} constant references only catalog permission codes.
 */
class PermissionExpressionsTest {
    private static final Pattern PERMISSION_CODE = Pattern.compile("'([A-Z0-9_]+)'");
    private static final List<String> CATALOG_CODES = List.of(
        "POS_ACCESS", "POS_TILL_MANAGE", "POS_RETURNS", "POS_DISCOUNT",
        "EBM_SUBMIT", "EBM_CONFIG", "EBM_AUDIT",
        "INVENTORY_READ", "INVENTORY_WRITE", "INVENTORY_SHRINKAGE",
        "PROCUREMENT_READ", "PROCUREMENT_WRITE",
        "FINANCE_READ", "FINANCE_WRITE", "FINANCE_CLOSE",
        "PAYROLL_READ", "PAYROLL_WRITE",
        "HR_READ", "HR_WRITE", "STAFF_INVITE",
        "ANALYTICS_OWN", "ANALYTICS_ALL", "REPORTS_EXPORT", "AI_COPILOT",
        "ROLE_MANAGE", "USER_MANAGE", "TENANT_CONFIG", "ASSETS_MANAGE"
    );

    @Test
    void allExpressionConstantsUseCatalogCodes() throws Exception {
        List<String> violations = new ArrayList<>();
        for (Field field : PermissionExpressions.class.getDeclaredFields()) {
            if (!Modifier.isStatic(field.getModifiers()) || field.getType() != String.class) {
                continue;
            }
            String expression = (String) field.get(null);
            Matcher matcher = PERMISSION_CODE.matcher(expression);
            while (matcher.find()) {
                String code = matcher.group(1);
                if (!CATALOG_CODES.contains(code)) {
                    violations.add(field.getName() + " references unknown code " + code);
                }
            }
        }
        assertThat(violations).isEmpty();
    }

    @Test
    void expressionsUsePermissionGuard() throws Exception {
        for (Field field : PermissionExpressions.class.getDeclaredFields()) {
            if (!Modifier.isStatic(field.getModifiers()) || field.getType() != String.class) {
                continue;
            }
            String expression = (String) field.get(null);
            assertThat(expression)
                .as(field.getName())
                .contains("@permissionGuard.has");
        }
    }
}
