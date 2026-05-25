import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { SmsDeliveryLogPage } from './SmsDeliveryLogPage'

export function SmsDeliveryLogRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <SmsDeliveryLogPage />
    </AppShell>
  )
}
