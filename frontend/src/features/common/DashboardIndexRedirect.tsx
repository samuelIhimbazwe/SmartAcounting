import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../shared/stores/authStore'
import { rolePathMap } from '../../shared/types/roles'

export function DashboardIndexRedirect() {
  const role = useAuthStore((state) => state.role)
  const accessToken = useAuthStore((state) => state.accessToken)
  if (!role || !accessToken) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={`/dashboard/${rolePathMap[role]}`} replace />
}
