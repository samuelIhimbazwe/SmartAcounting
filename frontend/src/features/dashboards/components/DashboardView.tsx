import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui'
import { useDashboardPayload } from '../hooks/useDashboardPayload'
import type { Role } from '../../../shared/types/roles'
import { roleChartTitleKeyMap } from '../../../shared/api/dashboardRoleConfig'
import { isApiError } from '../../../shared/api/errors'
import { useDateRangeStore, type DatePreset } from '../../../shared/stores/dateRangeStore'
import { DashboardPeriodSelector } from './DashboardPeriodSelector'
import { DashboardStatRow } from './DashboardStatRow'
import { DashboardRevenueChart } from './DashboardRevenueChart'
import { DashboardQuickActions } from './DashboardQuickActions'
import { DashboardThirdRow } from './DashboardThirdRow'
import '../dashboard.css'

interface DashboardViewProps {
  role: Role
  onOpenDrilldown: (metric: string) => void
}

const CHART_SUBTITLE_KEYS: Record<DatePreset, string> = {
  TODAY: 'dashboard.chartSubtitle.today',
  THIS_WEEK: 'dashboard.chartSubtitle.thisWeek',
  THIS_MONTH: 'dashboard.chartSubtitle.thisMonth',
  LAST_MONTH: 'dashboard.chartSubtitle.lastMonth',
  MTD: 'dashboard.chartSubtitle.thisMonth',
  YTD: 'dashboard.chartSubtitle.ytd',
  LAST_30: 'dashboard.chartSubtitle.last30',
}

export function DashboardView({ role, onOpenDrilldown }: DashboardViewProps) {
  const { t } = useTranslation()
  const preset = useDateRangeStore((s) => s.preset)
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useDashboardPayload(role)
  const roleTitle = t(`dashboard.titles.${role}`)
  const chartTitle = t('dashboard.revenueTrendTitle')
  const chartRoleHint = t(roleChartTitleKeyMap[role])
  const [now, setNow] = useState(() => Date.now())

  const freshnessMinutes = useMemo(() => {
    if (!dataUpdatedAt) {
      return null
    }
    return Math.floor(Math.max(0, now - dataUpdatedAt) / 60_000)
  }, [dataUpdatedAt, now])

  const isStale = freshnessMinutes !== null && freshnessMinutes >= 2
  const chartSubtitle = `${t(CHART_SUBTITLE_KEYS[preset] ?? CHART_SUBTITLE_KEYS.THIS_MONTH)} · ${chartRoleHint}`

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  if (isError && !data) {
    const status = isApiError(error) ? error.status : null
    const message =
      status === 403
        ? t('errors.dashboardForbidden')
        : status === 404
          ? t('errors.dashboardNotFound')
          : isApiError(error)
            ? error.message
            : t('errors.dashboardUnavailable')
    return (
      <section className="dash-page">
        <p className="dash-page__meta">{message}</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          {t('dashboard.retry')}
        </Button>
      </section>
    )
  }

  const kpis = data?.kpis ?? []
  const trend = data?.trend ?? []
  const showEmpty = !isLoading && kpis.length === 0 && trend.length === 0

  return (
    <section className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1 className="ui-page-header__title">{roleTitle}</h1>
          <p className="dash-page__meta">{t('dashboard.description')}</p>
          {freshnessMinutes !== null && (
            <p className="dash-page__status" role="status" aria-live="polite">
              {t('dashboard.lastUpdatedMinutes', { minutes: freshnessMinutes })}
              {isFetching ? ` · ${t('dashboard.refreshingBackground')}` : null}
            </p>
          )}
          {isStale && !isFetching && (
            <p className="dash-page__status dash-page__status--warn" role="status">
              {t('dashboard.staleWarning')}
            </p>
          )}
        </div>
        <DashboardPeriodSelector />
      </header>

      {showEmpty ? (
        <article className="dash-panel">
          <h2 className="dash-panel__title">{t('dashboard.emptyTitle')}</h2>
          <p className="dash-page__meta">{t('dashboard.emptyBody')}</p>
          <Button variant="primary" className="mt-4" onClick={() => void refetch()}>
            {t('dashboard.retry')}
          </Button>
        </article>
      ) : (
        <>
          <DashboardStatRow
            role={role}
            kpis={kpis}
            loading={isLoading}
            onOpenDrilldown={onOpenDrilldown}
          />

          <div className="dash-mid">
            <DashboardRevenueChart
              title={chartTitle}
              subtitle={chartSubtitle}
              data={trend}
              loading={isLoading}
            />
            <DashboardQuickActions role={role} />
          </div>

          <DashboardThirdRow role={role} />
        </>
      )}
    </section>
  )
}
