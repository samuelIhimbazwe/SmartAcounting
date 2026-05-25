import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { CustomerRecordPage } from './CustomerRecordPage'

export function CustomerRecordRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <CustomerRecordPage />
    </AppShell>
  )
}
