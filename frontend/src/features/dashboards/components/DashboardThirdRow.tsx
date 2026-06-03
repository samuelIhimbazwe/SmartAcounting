import type { Role } from '../../../shared/types/roles'
import { ROLE_THIRD_ROW } from '../config/roleKpiSlots'
import { DashboardAnomaliesPanel } from './DashboardAnomaliesPanel'
import { DashboardRecentPanel } from './DashboardRecentPanel'

export function DashboardThirdRow({ role }: { role: Role }) {
  const config = ROLE_THIRD_ROW[role]

  if (config.anomaliesInsteadOfRight) {
    return (
      <div className="dash-third dash-third--split">
        <DashboardRecentPanel role={role} config={config.left} />
        <DashboardAnomaliesPanel role={role} compact />
      </div>
    )
  }

  return (
    <div className="dash-third dash-third--split">
      <DashboardRecentPanel role={role} config={config.left} />
      <DashboardRecentPanel role={role} config={config.right} />
    </div>
  )
}
