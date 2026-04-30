import { DashboardView } from '../components/DashboardView'
import type { DashboardPageProps } from './types'

export default function HrDashboardPage({ onOpenDrilldown }: DashboardPageProps) {
  return <DashboardView role="HR" onOpenDrilldown={onOpenDrilldown} />
}
