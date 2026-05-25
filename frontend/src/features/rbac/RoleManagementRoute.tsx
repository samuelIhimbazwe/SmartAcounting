import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { RoleManagementPage } from './RoleManagementPage'

export function RoleManagementRoute() {
  const role = useAuthStore((s) => s.role)!

  return (
    <AppShell role={role}>
      <RoleManagementPage />
    </AppShell>
  )
}
