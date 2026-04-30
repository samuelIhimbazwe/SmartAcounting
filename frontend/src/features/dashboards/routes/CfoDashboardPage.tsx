import { DashboardView } from '../components/DashboardView'
import type { DashboardPageProps } from './types'

export default function CfoDashboardPage({ onOpenDrilldown }: DashboardPageProps) {
  return <DashboardView role="CFO" onOpenDrilldown={onOpenDrilldown} />
}
