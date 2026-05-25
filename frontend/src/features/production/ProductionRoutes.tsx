import type { ReactNode } from 'react'
import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { PaymentRunsPage } from '../finance/PaymentRunsPage'
import { FixedAssetsPage } from '../finance/FixedAssetsPage'
import { MonthEndClosePage } from '../finance/MonthEndClosePage'
import { WorkflowRulesPage } from '../admin/WorkflowRulesPage'
import { DocumentsPage } from '../documents/DocumentsPage'
import { AttendancePage } from '../hr/AttendancePage'
import { MarketingCampaignsPage } from '../marketing/MarketingCampaignsPage'
import { PromotionsPage } from '../marketing/PromotionsPage'

function ShellRoute({ children }: { children: ReactNode }) {
  const sessionRole = useAuthStore((s) => s.role)!
  return <AppShell role={sessionRole}>{children}</AppShell>
}

export function PaymentRunsRoute() {
  return (
    <ShellRoute>
      <PaymentRunsPage />
    </ShellRoute>
  )
}

export function FixedAssetsRoute() {
  return (
    <ShellRoute>
      <FixedAssetsPage />
    </ShellRoute>
  )
}

export function MonthEndCloseRoute() {
  return (
    <ShellRoute>
      <MonthEndClosePage />
    </ShellRoute>
  )
}

export function WorkflowRulesRoute() {
  return (
    <ShellRoute>
      <WorkflowRulesPage />
    </ShellRoute>
  )
}

export function DocumentsRoute() {
  return (
    <ShellRoute>
      <DocumentsPage />
    </ShellRoute>
  )
}

export function AttendanceRoute() {
  return (
    <ShellRoute>
      <AttendancePage />
    </ShellRoute>
  )
}

export function MarketingCampaignsRoute() {
  return (
    <ShellRoute>
      <MarketingCampaignsPage />
    </ShellRoute>
  )
}

export function PromotionsRoute() {
  return (
    <ShellRoute>
      <PromotionsPage />
    </ShellRoute>
  )
}
