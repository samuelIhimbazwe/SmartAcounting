import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { RetailOpsPage } from './RetailOpsPage'

export function RetailOpsRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <RetailOpsPage />
    </AppShell>
  )
}
