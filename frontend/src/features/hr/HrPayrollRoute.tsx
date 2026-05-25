import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { HrPayrollPage } from './HrPayrollPage'

export function HrPayrollRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <HrPayrollPage />
    </AppShell>
  )
}
