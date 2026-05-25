import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { SaleHistoryPage } from '../../pages/pos/SaleHistoryPage'

export function PosSaleHistoryRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <SaleHistoryPage />
    </AppShell>
  )
}
