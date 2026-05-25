import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { SupplierBillsPage } from './SupplierBillsPage'

export function SupplierBillsRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <SupplierBillsPage />
    </AppShell>
  )
}
