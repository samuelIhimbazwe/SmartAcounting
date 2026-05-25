import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { TillSessionPage } from '../../pages/till/TillSessionPage'

export function TillRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <TillSessionPage />
    </AppShell>
  )
}
