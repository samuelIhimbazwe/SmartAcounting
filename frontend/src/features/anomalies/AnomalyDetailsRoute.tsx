import { AppShell } from '../../shared/components/layout/AppShell'
import { useAuthStore } from '../../shared/stores/authStore'
import { AnomalyDetailsPage } from './AnomalyDetailsPage'

export function AnomalyDetailsRoute() {
  const role = useAuthStore((state) => state.role)!

  return (
    <AppShell role={role}>
      <AnomalyDetailsPage />
    </AppShell>
  )
}
