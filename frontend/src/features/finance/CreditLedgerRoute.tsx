import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { CreditLedgerPage } from './CreditLedgerPage'

export function CreditLedgerRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <CreditLedgerPage />
    </AppShell>
  )
}
