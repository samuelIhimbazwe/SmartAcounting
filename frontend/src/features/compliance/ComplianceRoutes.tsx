import type { ReactNode } from 'react'
import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { EbmCompliancePage } from './EbmCompliancePage'
import { RraSettingsPage } from './RraSettingsPage'
import { VatPage } from './VatPage'
import { PayePage } from './PayePage'
import { AuditLogPage } from './AuditLogPage'

function ComplianceShell({ children }: { children: ReactNode }) {
  const sessionRole = useAuthStore((s) => s.role)!
  return <AppShell role={sessionRole}>{children}</AppShell>
}

export function EbmComplianceRoute() {
  return (
    <ComplianceShell>
      <EbmCompliancePage />
    </ComplianceShell>
  )
}

export function RraSettingsRoute() {
  return (
    <ComplianceShell>
      <RraSettingsPage />
    </ComplianceShell>
  )
}

export function VatComplianceRoute() {
  return (
    <ComplianceShell>
      <VatPage />
    </ComplianceShell>
  )
}

export function PayeComplianceRoute() {
  return (
    <ComplianceShell>
      <PayePage />
    </ComplianceShell>
  )
}

export function AuditLogRoute() {
  return (
    <ComplianceShell>
      <AuditLogPage />
    </ComplianceShell>
  )
}
