import { useTranslation } from 'react-i18next'
import { Skeleton, StatCard } from '../../../components/ui'
import type { KPIItem } from '../../../shared/types/dashboard'
import type { Role } from '../../../shared/types/roles'
import { resolveRoleKpiSlots } from '../utils/mapKpiSlots'
import { formatDashboardKpiValue, kpiTrendMeta } from '../utils/dashboardFormat'

interface DashboardStatRowProps {
  role: Role
  kpis: KPIItem[]
  loading?: boolean
  onOpenDrilldown: (metric: string) => void
}

export function DashboardStatRow({ role, kpis, loading, onOpenDrilldown }: DashboardStatRowProps) {
  const { t } = useTranslation()
  const slots = resolveRoleKpiSlots(role, kpis)

  if (loading) {
    return (
      <div className="dash-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <article key={i} className="ui-stat-card dash-stats__card">
            <Skeleton variant="text" width="60%" height={12} />
            <Skeleton variant="text" height={32} className="dash-stats__value-sk" />
            <Skeleton variant="text" width="40%" height={12} />
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="dash-stats">
      {slots.map(({ slot, kpi }, index) => {
        const label = t(`dashboard.kpiLabels.${slot.labelKey}`)
        if (!kpi) {
          return (
            <StatCard key={slot.labelKey} label={label} value="—" change={t('kpi.vsLastPeriod')} trend="flat" />
          )
        }
        const { change, trend } = kpiTrendMeta(kpi)
        return (
          <button
            key={slot.labelKey}
            type="button"
            className="dash-stats__btn"
            data-testid={`kpi-card-${index}`}
            onClick={() => onOpenDrilldown(kpi.label)}
            aria-label={`${label} ${t('dashboard.openDrilldown')}`}
          >
            <StatCard label={label} value={formatDashboardKpiValue(kpi)} change={change} trend={trend} />
          </button>
        )
      })}
    </div>
  )
}
