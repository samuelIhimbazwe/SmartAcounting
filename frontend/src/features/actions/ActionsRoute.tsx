import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { ActionQueuePage } from './ActionQueuePage'

export function ActionsRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <ActionQueuePage />
    </AppShell>
  )
}
