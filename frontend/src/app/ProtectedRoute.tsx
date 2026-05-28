import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../shared/stores/authStore'
import { getDefaultRoute } from '../shared/routing/getDefaultRoute'

export function ProtectedRoute({
  permission,
  children,
}: {
  /** Single permission or any-of list (mirrors backend hasAny). */
  permission?: string | readonly string[]
  children: ReactNode
}) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const role = useAuthStore((s) => s.role)
  const setupComplete = useAuthStore((s) => s.setupComplete)
  const assignedRoles = useAuthStore((s) => s.assignedRoles)
  const permissions = useAuthStore((s) => s.permissions)
  const effectiveRoleProfile = useAuthStore((s) => s.effectiveRoleProfile)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (!setupComplete && !assignedRoles.some((role) => role.id != null)) {
    return <Navigate to="/onboarding" replace />
  }

  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (permission) {
    const allowed =
      typeof permission === 'string'
        ? hasPermission(permission)
        : permission.some((code) => hasPermission(code))
    if (!allowed) {
      return <Navigate to={getDefaultRoute(role, permissions, effectiveRoleProfile)} replace />
    }
  }

  return <>{children}</>
}
