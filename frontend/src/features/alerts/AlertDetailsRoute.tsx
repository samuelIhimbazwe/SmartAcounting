import { AppShell } from '../../shared/components/layout/AppShell'
import { useAuthStore } from '../../shared/stores/authStore'
import { AlertDetailsPage } from './AlertDetailsPage'

export function AlertDetailsRoute() {
  const role = useAuthStore((state) => state.role)!

  return (
    <AppShell role={role}>
      <AlertDetailsPage />
    </AppShell>
  )
}
