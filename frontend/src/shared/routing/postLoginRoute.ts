import { getDefaultRoute } from './getDefaultRoute'
import type { Role } from '../types/roles'
import type { RoleProfile } from '../types/roleProfiles'

/**
 * Where to send the user immediately after a successful login or OAuth callback.
 * Staff with pre-assigned RBAC roles skip onboarding even when the tenant has not
 * finished owner setup yet.
 */
export function resolvePostLoginRoute(
  setupComplete: boolean,
  role: Role | null | undefined,
  permissions: string[],
  assignedRoles: { id?: string | null }[],
  roleProfile?: RoleProfile | null,
): string {
  const hasRbacRoles = assignedRoles.some((role) => role.id != null)
  if (!setupComplete && !hasRbacRoles) {
    return '/onboarding'
  }
  return getDefaultRoute(role, permissions, roleProfile)
}
