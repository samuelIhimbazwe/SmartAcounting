import type { Role } from '../types/roles'

/**
 * Permission codes mirrored from backend {@code PermissionExpressions}.
 * Use with {@link usePermission} / {@link useAnyPermission} — never role name strings.
 */
export const Permission = {
  POS_ACCESS: 'POS_ACCESS',
  POS_TILL_MANAGE: 'POS_TILL_MANAGE',
  POS_RETURNS: 'POS_RETURNS',
  ANALYTICS_OWN: 'ANALYTICS_OWN',
  ANALYTICS_ALL: 'ANALYTICS_ALL',
  FINANCE_READ: 'FINANCE_READ',
  CUSTOMER_ACCESS: 'CUSTOMER_ACCESS',
} as const

export type PermissionCode = (typeof Permission)[keyof typeof Permission]

/** Backend {@code PermissionExpressions.ANALYTICS_ANY} — own or tenant-wide analytics. */
export const ANALYTICS_ANY: readonly PermissionCode[] = [
  Permission.ANALYTICS_OWN,
  Permission.ANALYTICS_ALL,
]

/** Dashboard visibility by permission (mirrors backend {@link DashboardRoleResolver}). */
export const DASHBOARD_PERMISSIONS: Record<Role, string[]> = {
  CEO: [Permission.ANALYTICS_ALL, 'TENANT_CONFIG'],
  CFO: [Permission.FINANCE_READ, 'FINANCE_WRITE', 'FINANCE_CLOSE'],
  SALES: [Permission.POS_ACCESS, Permission.ANALYTICS_OWN],
  OPERATIONS: ['INVENTORY_READ', 'PROCUREMENT_READ', 'INVENTORY_WRITE'],
  HR: ['HR_READ', 'PAYROLL_READ', 'HR_WRITE'],
  MARKETING: ['AI_COPILOT', Permission.ANALYTICS_ALL],
  ACCOUNTING: [Permission.FINANCE_READ, 'EBM_AUDIT', 'FINANCE_WRITE'],
}

export function normalizePermissions(permissions: string[] | undefined | null): Set<string> {
  return new Set(
    (permissions ?? [])
      .filter((p) => p && p.trim())
      .map((p) => p.trim().toUpperCase()),
  )
}

export function hasPermission(permissions: Set<string>, code: string): boolean {
  const normalized = code.trim().toUpperCase()
  if (permissions.has(Permission.ANALYTICS_ALL) || permissions.has('TENANT_CONFIG')) {
    return true
  }
  return permissions.has(normalized)
}

export function hasAnyPermission(permissions: Set<string>, codes: string[]): boolean {
  if (codes.length === 0) {
    return true
  }
  return codes.some((code) => hasPermission(permissions, code))
}

export function canAccessRoleDashboard(permissions: Set<string>, targetRole: Role): boolean {
  if (hasPermission(permissions, Permission.ANALYTICS_ALL)) {
    return true
  }
  return hasAnyPermission(permissions, DASHBOARD_PERMISSIONS[targetRole])
}
