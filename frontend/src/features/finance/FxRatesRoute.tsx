import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { FxRatesPage } from './FxRatesPage'

export function FxRatesRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <FxRatesPage />
    </AppShell>
  )
}
