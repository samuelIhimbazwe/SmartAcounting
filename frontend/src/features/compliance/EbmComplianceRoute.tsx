import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { EbmCompliancePage } from './EbmCompliancePage'

export function EbmComplianceRoute() {
  const sessionRole = useAuthStore((s) => s.role)!

  return (
    <AppShell role={sessionRole}>
      <EbmCompliancePage />
    </AppShell>
  )
}
