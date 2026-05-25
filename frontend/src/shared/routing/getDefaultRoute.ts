import { accessibleDashboardRoles, canAccessRoleDashboard } from '../security/roleAccess'
import { findNavItemByRoute } from '../components/layout/navConfig'
import type { RoleProfile } from '../types/roleProfiles'
import { roleDashboardPath } from '../components/layout/navConfig'
import { roles, type Role } from '../types/roles'

/**
 * First screen after login when onboarding is complete.
 */
export function getDefaultRoute(role: Role | null | undefined, permissions: string[], roleProfile?: RoleProfile | null): string {
  const hasPermission = (code: string) => permissions.includes(code)
  if (roleProfile?.landingRoute) {
    if (roleProfile.landingRoute.startsWith('/dashboard/')) {
      const matchingDashboard = roles.find((candidate) => roleDashboardPath(candidate) === roleProfile.landingRoute) ?? null
      if (matchingDashboard && role && canAccessRoleDashboard(role, matchingDashboard, permissions, roleProfile)) {
        return roleProfile.landingRoute
      }
    } else if (findNavItemByRoute(roleProfile.landingRoute, hasPermission, roleProfile)) {
      return roleProfile.landingRoute
    }
  }
  if (role) {
    if (canAccessRoleDashboard(role, role, permissions, roleProfile)) {
      return roleDashboardPath(role)
    }
    const preferredDashboard = accessibleDashboardRoles(role, permissions, roleProfile).find((candidate) => candidate !== role) ?? null
    if (preferredDashboard) {
      return roleDashboardPath(preferredDashboard)
    }
  }
  if (permissions.includes('POS_ACCESS')) {
    return '/pos'
  }
  if (permissions.includes('FINANCE_READ')) {
    return '/finance/fx-rates'
  }
  if (permissions.includes('INVENTORY_READ')) {
    return '/retail'
  }
  return '/settings'
}
