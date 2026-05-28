import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { CustomersPage } from './CustomersPage'
import { CustomerDetailPage } from './CustomerDetailPage'

export function CustomersRoute() {
  const sessionRole = useAuthStore(s => s.role)!

  return (
    <AppShell role={sessionRole}>
      <CustomersPage />
    </AppShell>
  )
}

export function CustomerDetailRoute() {
  const sessionRole = useAuthStore(s => s.role)!

  return (
    <AppShell role={sessionRole}>
      <CustomerDetailPage />
    </AppShell>
  )
}
