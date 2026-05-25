import type { Role } from '../types/roles'
import type { RoleProfile } from '../types/roleProfiles'
import { canAccessRoleDashboard as canAccessByPermissions, normalizePermissions } from './permissions'

const legacyMatrix: Record<Role, Role[]> = {
  CEO: ['CEO', 'CFO', 'SALES', 'OPERATIONS', 'HR', 'MARKETING', 'ACCOUNTING'],
  CFO: ['CFO'],
  SALES: ['SALES'],
  OPERATIONS: ['OPERATIONS'],
  HR: ['HR'],
  MARKETING: ['MARKETING'],
  ACCOUNTING: ['ACCOUNTING'],
}

export function canAccessRoleDashboard(
  sessionRole: Role,
  targetRole: Role,
  permissions?: string[] | null,
  roleProfile?: RoleProfile | null,
): boolean {
  if (roleProfile && roleProfile.dashboardIds.length > 0) {
    return roleProfile.dashboardIds.includes(targetRole)
  }
  if (permissions && permissions.length > 0) {
    return canAccessByPermissions(normalizePermissions(permissions), targetRole)
  }
  return legacyMatrix[sessionRole]?.includes(targetRole) ?? false
}

export function accessibleDashboardRoles(
  sessionRole: Role,
  permissions?: string[] | null,
  roleProfile?: RoleProfile | null,
): Role[] {
  if (roleProfile && roleProfile.dashboardIds.length > 0) {
    return [...roleProfile.dashboardIds]
  }
  return (Object.keys(legacyMatrix) as Role[]).filter((candidate) =>
    canAccessRoleDashboard(sessionRole, candidate, permissions, roleProfile),
  )
}
