import { DashboardView } from '../components/DashboardView'
import type { DashboardPageProps } from './types'

export default function SalesDashboardPage({ onOpenDrilldown }: DashboardPageProps) {
  return <DashboardView role="SALES" onOpenDrilldown={onOpenDrilldown} />
}
