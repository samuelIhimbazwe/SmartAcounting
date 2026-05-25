import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { SupplierRecordPage } from './SupplierRecordPage'

export function SupplierRecordRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <SupplierRecordPage />
    </AppShell>
  )
}
