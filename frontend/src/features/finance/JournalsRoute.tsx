import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { JournalsPage } from './JournalsPage'

export function JournalsRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <JournalsPage />
    </AppShell>
  )
}
