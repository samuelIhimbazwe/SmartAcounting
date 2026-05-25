import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { PosCheckoutPage } from './PosCheckoutPage'
export function PosRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole} mainClassName="app-shell__content--pos">
      <PosCheckoutPage />
    </AppShell>
  )
}
