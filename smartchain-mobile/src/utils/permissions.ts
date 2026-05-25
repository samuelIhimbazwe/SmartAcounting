/** Permission codes aligned with backend RBAC catalog. */
export type PermissionCode = string;

export function normalizePermissions(codes: string[] | undefined | null): Set<string> {
  return new Set(
    (codes ?? [])
      .filter(Boolean)
      .map(code => code.trim().toUpperCase()),
  );
}

export function hasPermission(
  permissions: Set<string>,
  code: string,
): boolean {
  const normalized = code.trim().toUpperCase();
  if (
    permissions.has('ANALYTICS_ALL') ||
    permissions.has('TENANT_CONFIG')
  ) {
    return true;
  }
  return permissions.has(normalized);
}

export function hasAnyPermission(
  permissions: Set<string>,
  codes: string[],
): boolean {
  return codes.some(code => hasPermission(permissions, code));
}

export interface MobileTabFlags {
  showTill: boolean;
  showPos: boolean;
  showStock: boolean;
  showCustomers: boolean;
  showDashboard: boolean;
  showCopilot: boolean;
  cashierShell: boolean;
}

/**
 * Derives mobile tab visibility from effective permissions (with legacy role fallback).
 */
export function resolveMobileTabs(
  permissions: string[],
  legacyRoles: string[],
): MobileTabFlags {
  const perms =
    permissions.length > 0
      ? normalizePermissions(permissions)
      : normalizePermissions(legacyPermissionsFromRoles(legacyRoles));

  const cashierShell =
    hasAnyPermission(perms, ['POS_ACCESS', 'POS_TILL_MANAGE']) &&
    !hasAnyPermission(perms, [
      'INVENTORY_WRITE',
      'PROCUREMENT_WRITE',
      'ANALYTICS_ALL',
      'FINANCE_READ',
    ]) &&
    (legacyRoles.includes('CASHIER') ||
      legacyRoles.includes('POS_OPERATOR') ||
      permissions.length > 0);

  const showTill = hasAnyPermission(perms, [
    'POS_TILL_MANAGE',
    'POS_ACCESS',
  ]);
  const showPos = hasAnyPermission(perms, ['POS_ACCESS']);
  const showStock =
    !cashierShell &&
    hasAnyPermission(perms, [
      'INVENTORY_READ',
      'INVENTORY_WRITE',
      'PROCUREMENT_READ',
    ]);
  const showCustomers =
    !cashierShell &&
    hasAnyPermission(perms, ['POS_ACCESS', 'FINANCE_READ', 'INVENTORY_READ']);
  const showDashboard =
    !cashierShell &&
    hasAnyPermission(perms, ['ANALYTICS_OWN', 'ANALYTICS_ALL', 'FINANCE_READ']);
  const showCopilot =
    !cashierShell && hasPermission(perms, 'AI_COPILOT');

  return {
    showTill,
    showPos,
    showStock,
    showCustomers,
    showDashboard,
    showCopilot,
    cashierShell,
  };
}

function legacyPermissionsFromRoles(roles: string[]): string[] {
  const codes: string[] = [];
  for (const role of roles) {
    switch (role) {
      case 'CEO':
        codes.push('ANALYTICS_ALL', 'POS_ACCESS', 'INVENTORY_WRITE');
        break;
      case 'CFO':
        codes.push('FINANCE_READ', 'ANALYTICS_ALL');
        break;
      case 'OPS_MANAGER':
        codes.push('INVENTORY_WRITE', 'PROCUREMENT_WRITE', 'POS_ACCESS');
        break;
      case 'SALES_MANAGER':
        codes.push('POS_ACCESS', 'INVENTORY_READ');
        break;
      case 'ACCOUNTING_CONTROLLER':
        codes.push('FINANCE_READ', 'EBM_AUDIT');
        break;
      case 'CASHIER':
      case 'POS_OPERATOR':
        codes.push('POS_ACCESS', 'POS_TILL_MANAGE', 'EBM_SUBMIT');
        break;
      default:
        break;
    }
  }
  return codes;
}
