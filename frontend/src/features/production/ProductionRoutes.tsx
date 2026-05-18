import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../shared/stores/authStore'
import type { Role } from '../../shared/types/roles'
import { AppShell } from '../../shared/components/layout/AppShell'
import { PaymentRunsPage } from '../finance/PaymentRunsPage'
import { FixedAssetsPage } from '../finance/FixedAssetsPage'
import { MonthEndClosePage } from '../finance/MonthEndClosePage'
import { WorkflowRulesPage } from '../admin/WorkflowRulesPage'
import { DocumentsPage } from '../documents/DocumentsPage'
import { AttendancePage } from '../hr/AttendancePage'

function guard(allowed: Role[], children: ReactNode) {
  const sessionRole = useAuthStore((s) => s.role)
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken || !sessionRole) return <Navigate to="/login" replace />
  if (!allowed.includes(sessionRole)) return <Navigate to="/unauthorized" replace />
  return <AppShell role={sessionRole}>{children}</AppShell>
}

export function PaymentRunsRoute() {
  return guard(['CEO', 'CFO', 'ACCOUNTING'], <PaymentRunsPage />)
}

export function FixedAssetsRoute() {
  return guard(['CEO', 'CFO', 'ACCOUNTING'], <FixedAssetsPage />)
}

export function MonthEndCloseRoute() {
  return guard(['CEO', 'CFO', 'ACCOUNTING'], <MonthEndClosePage />)
}

export function WorkflowRulesRoute() {
  return guard(['CEO', 'CFO'], <WorkflowRulesPage />)
}

export function DocumentsRoute() {
  return guard(['CEO', 'CFO', 'ACCOUNTING', 'OPERATIONS'], <DocumentsPage />)
}

export function AttendanceRoute() {
  return guard(['CEO', 'CFO', 'HR', 'ACCOUNTING'], <AttendancePage />)
}
