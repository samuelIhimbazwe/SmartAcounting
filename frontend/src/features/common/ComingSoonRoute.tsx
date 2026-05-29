import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { ComingSoonPage } from './ComingSoonPage'

export function ComingSoonRoute() {
  const role = useAuthStore((s) => s.role)!

  return (
    <AppShell role={role}>
      <ComingSoonPage />
    </AppShell>
  )
}
