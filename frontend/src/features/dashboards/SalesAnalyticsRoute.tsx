import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { SalesAnalyticsPage } from './SalesAnalyticsPage'

export function SalesAnalyticsRoute() {
  const role = useAuthStore(s => s.role)!

  return (
    <AppShell role={role}>
      <SalesAnalyticsPage />
    </AppShell>
  )
}
