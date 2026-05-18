import { Navigate } from 'react-router-dom'
import { AppShell } from '../../shared/components/layout/AppShell'
import { useAuthStore } from '../../shared/stores/authStore'
import { SettingsPage } from './SettingsPage'

export function SettingsRoute() {
  const role = useAuthStore((state) => state.role)
  const accessToken = useAuthStore((state) => state.accessToken)

  if (!sessionRoleOrToken(role, accessToken)) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppShell role={role}>
      <SettingsPage />
    </AppShell>
  )
}

function sessionRoleOrToken(
  role: ReturnType<typeof useAuthStore.getState>['role'],
  accessToken: string | null,
): role is NonNullable<typeof role> {
  return Boolean(role && accessToken)
}
