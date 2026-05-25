import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { BankReconciliationPage } from './BankReconciliationPage'

export function BankReconciliationRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <BankReconciliationPage />
    </AppShell>
  )
}
