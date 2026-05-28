import type { ReactNode } from 'react'
import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { EmployeesPage } from './EmployeesPage'
import { EmployeeDetailPage } from './EmployeeDetailPage'
import { LeavePage } from './LeavePage'
import { ShiftsPage } from './ShiftsPage'

function Shell({ children }: { children: ReactNode }) {
  const sessionRole = useAuthStore(s => s.role)!
  return <AppShell role={sessionRole}>{children}</AppShell>
}

export function EmployeesRoute() {
  return (
    <Shell>
      <EmployeesPage />
    </Shell>
  )
}

export function EmployeeDetailRoute() {
  return (
    <Shell>
      <EmployeeDetailPage />
    </Shell>
  )
}

export function LeaveRoute() {
  return (
    <Shell>
      <LeavePage />
    </Shell>
  )
}

export function ShiftsRoute() {
  return (
    <Shell>
      <ShiftsPage />
    </Shell>
  )
}
