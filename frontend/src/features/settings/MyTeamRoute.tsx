import { AppShell } from '../../shared/components/layout/AppShell'
import { useAuthStore } from '../../shared/stores/authStore'
import { MyTeamPage } from './MyTeamPage'

export function MyTeamRoute() {
  const role = useAuthStore((state) => state.role)!

  return (
    <AppShell role={role}>
      <MyTeamPage />
    </AppShell>
  )
}
