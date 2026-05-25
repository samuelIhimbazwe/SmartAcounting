import { AppShell } from '../../shared/components/layout/AppShell'
import { useAuthStore } from '../../shared/stores/authStore'
import { SettingsPage } from './SettingsPage'

export function SettingsRoute() {
  const role = useAuthStore((state) => state.role)!

  return (
    <AppShell role={role}>
      <SettingsPage />
    </AppShell>
  )
}
