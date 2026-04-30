import { DashboardView } from '../components/DashboardView'
import type { DashboardPageProps } from './types'

export default function OperationsDashboardPage({ onOpenDrilldown }: DashboardPageProps) {
  return <DashboardView role="OPERATIONS" onOpenDrilldown={onOpenDrilldown} />
}
