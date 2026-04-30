import { DashboardView } from '../components/DashboardView'
import type { DashboardPageProps } from './types'

export default function CeoDashboardPage({ onOpenDrilldown }: DashboardPageProps) {
  return <DashboardView role="CEO" onOpenDrilldown={onOpenDrilldown} />
}
