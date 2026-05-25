import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { PurchaseOrdersPage } from './PurchaseOrdersPage'

export function PurchaseOrdersRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <PurchaseOrdersPage />
    </AppShell>
  )
}
