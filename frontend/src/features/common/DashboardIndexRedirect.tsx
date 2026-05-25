import { Navigate } from 'react-router-dom'
import { getDefaultRoute } from '../../shared/routing/getDefaultRoute'
import { useAuthStore } from '../../shared/stores/authStore'

export function DashboardIndexRedirect() {
  const role = useAuthStore((state) => state.role)
  const accessToken = useAuthStore((state) => state.accessToken)
  const permissions = useAuthStore((state) => state.permissions)
  const effectiveRoleProfile = useAuthStore((state) => state.effectiveRoleProfile)
  if (!role || !accessToken) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={getDefaultRoute(role, permissions, effectiveRoleProfile)} replace />
}
