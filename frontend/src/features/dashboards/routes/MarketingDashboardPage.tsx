import { DashboardView } from '../components/DashboardView'
import type { DashboardPageProps } from './types'

export default function MarketingDashboardPage({ onOpenDrilldown }: DashboardPageProps) {
  return <DashboardView role="MARKETING" onOpenDrilldown={onOpenDrilldown} />
}
