import { DashboardView } from '../components/DashboardView'
import type { DashboardPageProps } from './types'

export default function AccountingDashboardPage({ onOpenDrilldown }: DashboardPageProps) {
  return <DashboardView role="ACCOUNTING" onOpenDrilldown={onOpenDrilldown} />
}
