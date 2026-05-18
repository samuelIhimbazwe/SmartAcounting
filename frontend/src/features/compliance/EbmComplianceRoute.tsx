import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../shared/stores/authStore'
import type { Role } from '../../shared/types/roles'
import { AppShell } from '../../shared/components/layout/AppShell'
import { EbmCompliancePage } from './EbmCompliancePage'

const allowed: Role[] = ['CEO', 'CFO', 'ACCOUNTING']

export function EbmComplianceRoute() {
  const sessionRole = useAuthStore((s) => s.role)
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken || !sessionRole) return <Navigate to="/login" replace />
  if (!allowed.includes(sessionRole)) return <Navigate to="/unauthorized" replace />
  return (
    <AppShell role={sessionRole}>
      <EbmCompliancePage />
    </AppShell>
  )
}
