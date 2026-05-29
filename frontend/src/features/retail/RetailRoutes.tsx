import type { ReactNode } from 'react'
import { useAuthStore } from '../../shared/stores/authStore'
import { AppShell } from '../../shared/components/layout/AppShell'
import { PriceListDetailPage } from './PriceListDetailPage'
import { PriceListsPage } from './PriceListsPage'
import { RetailOpsPage } from './RetailOpsPage'
import { ShrinkagePage } from './ShrinkagePage'
import { StockTransfersPage } from './StockTransfersPage'

function Shell({ children }: { children: ReactNode }) {
  const sessionRole = useAuthStore(s => s.role)!
  return <AppShell role={sessionRole}>{children}</AppShell>
}

export function RetailOpsRoute() {
  return (
    <Shell>
      <RetailOpsPage />
    </Shell>
  )
}

export function StockTransfersRoute() {
  return (
    <Shell>
      <StockTransfersPage />
    </Shell>
  )
}

export function ShrinkageRoute() {
  return (
    <Shell>
      <ShrinkagePage />
    </Shell>
  )
}

export function PriceListsRoute() {
  return (
    <Shell>
      <PriceListsPage />
    </Shell>
  )
}

export function PriceListDetailRoute() {
  return (
    <Shell>
      <PriceListDetailPage />
    </Shell>
  )
}
