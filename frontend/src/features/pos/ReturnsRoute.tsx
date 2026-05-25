import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { ReturnsPage } from '../../pages/pos/ReturnsPage'

export function ReturnsRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <ReturnsPage />
    </AppShell>
  )
}
