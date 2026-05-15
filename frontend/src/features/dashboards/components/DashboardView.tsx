import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import { KpiCard } from '../../../shared/components/ui/KpiCard'
import { ActivitySummaryBar } from './ActivitySummaryBar'
import { useDashboardPayload } from '../hooks/useDashboardPayload'
import type { Role } from '../../../shared/types/roles'
import { ActionsPanel } from '../../actions/ActionsPanel'
import { DashboardAnomaliesPanel } from './DashboardAnomaliesPanel'
import { roleChartTitleKeyMap } from '../../../shared/api/dashboardRoleConfig'
import { isApiError } from '../../../shared/api/errors'
import { formatNumber } from '../../../shared/utils/intl'

/** Fixed height avoids Recharts ResponsiveContainer measuring -1 in flex layouts. */
const TREND_CHART_PX = 320

interface DashboardViewProps {
  role: Role
  onOpenDrilldown: (metric: string) => void
}

export function DashboardView({ role, onOpenDrilldown }: DashboardViewProps) {
  const { t } = useTranslation()
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useDashboardPayload(role)
  const roleTitle = t(`dashboard.titles.${role}`)
  const chartTitle = t(roleChartTitleKeyMap[role])
  const [now, setNow] = useState(() => Date.now())
  const [showActual, setShowActual] = useState(true)
  const [showBenchmark, setShowBenchmark] = useState(true)
  const freshnessMinutes = useMemo(() => {
    if (!dataUpdatedAt) {
      return null
    }
    const diff = Math.max(0, now - dataUpdatedAt)
    return Math.floor(diff / 60_000)
  }, [dataUpdatedAt, now])
  const isStale = freshnessMinutes !== null && freshnessMinutes >= 2
  const latestTrendPoint = data?.trend[data.trend.length - 1]
  const variance =
    latestTrendPoint && typeof latestTrendPoint.benchmark === 'number'
      ? latestTrendPoint.value - latestTrendPoint.benchmark
      : null
  const varianceLabel =
    variance === null
      ? null
      : `${variance >= 0 ? '+' : '-'}${formatNumber(Math.abs(variance))}`

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  if (isLoading) {
    return <p className="text-sm text-neutral-500">{t('dashboard.loadingData')}</p>
  }

  if (isError || !data) {
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
      <section className="space-y-3">
        <p className="text-sm text-neutral-600">{message}</p>
        <button
          type="button"
          className="rounded-md border border-[var(--border-default)] px-3 py-2 text-sm text-neutral-700"
          onClick={() => void refetch()}
        >
          {t('dashboard.retry')}
        </button>
      </section>
    )
  }

  if (data.kpis.length === 0 && data.trend.length === 0) {
    return (
      <section className="space-y-3 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--color-surface)] p-6 text-center">
        <h2 className="m-0 font-[var(--font-display)] text-xl font-semibold text-neutral-900">{t('dashboard.emptyTitle')}</h2>
        <p className="m-0 text-sm text-neutral-600">{t('dashboard.emptyBody')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="m-0 font-[var(--font-display)] text-2xl font-semibold text-neutral-900">{roleTitle}</h2>
        <p className="m-0 mt-1 max-w-3xl text-sm text-neutral-600">{t('dashboard.description')}</p>
        {freshnessMinutes !== null && (
          <p className="m-0 mt-1 text-xs text-neutral-500" role="status" aria-live="polite">
            {t('dashboard.lastUpdatedMinutes', { minutes: freshnessMinutes })}
          </p>
        )}
        {isFetching && (
          <p className="m-0 mt-1 text-xs text-neutral-500" role="status" aria-live="polite">
            {t('dashboard.refreshingBackground')}
          </p>
        )}
        {isStale && !isFetching && (
          <p className="m-0 mt-1 text-xs text-amber-700" role="status" aria-live="polite">
            {t('dashboard.staleWarning')}
          </p>
        )}
      </header>

      {(role === 'CFO' || role === 'ACCOUNTING') && data.kpis.length > 0 && (
        <ActivitySummaryBar role={role} kpis={data.kpis} />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:col-span-9 xl:grid-cols-4">
          {data.kpis.map((kpi, index) => (
            <button
              key={kpi.label}
              type="button"
              className="rounded-2xl text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              data-testid={`kpi-card-${index}`}
              onClick={() => onOpenDrilldown(kpi.label)}
              aria-label={`${kpi.label} ${t('dashboard.openDrilldown')}`}
            >
              <KpiCard
                label={kpi.label}
                value={kpi.value}
                trend={kpi.trend}
                format={kpi.format}
                displayValue={kpi.displayValue}
                trendDisplay={kpi.trendDisplay}
                status={kpi.status}
              />
            </button>
          ))}
        </div>
        <div className="xl:col-span-3">
          <ActionsPanel role={role} />
        </div>
      </div>

      <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-base font-semibold text-neutral-800">{chartTitle}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`rounded-md border px-2 py-1 text-xs ${
                showActual
                  ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                  : 'border-[var(--border-default)] text-neutral-700'
              } transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
              aria-pressed={showActual}
              onClick={() => {
                if (showActual && !showBenchmark) {
                  return
                }
                setShowActual((value) => !value)
              }}
            >
              {t('chart.showActual')}
            </button>
            <button
              type="button"
              className={`rounded-md border px-2 py-1 text-xs ${
                showBenchmark
                  ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                  : 'border-[var(--border-default)] text-neutral-700'
              } transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
              aria-pressed={showBenchmark}
              onClick={() => {
                if (showBenchmark && !showActual) {
                  return
                }
                setShowBenchmark((value) => !value)
              }}
            >
              {t('chart.showBenchmark')}
            </button>
            {varianceLabel && (
              <span
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  variance !== null && variance >= 0
                    ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]'
                    : 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]'
                }`}
              >
                {t('chart.varianceLabel', { value: varianceLabel })}
              </span>
            )}
          </div>
        </div>
        <div className="w-full min-w-0 shrink-0" style={{ height: TREND_CHART_PX }}>
          <ResponsiveContainer width="100%" height={TREND_CHART_PX} debounce={50}>
            <LineChart data={data.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              {showActual && (
                <Line type="monotone" dataKey="value" stroke="var(--chart-series-a)" strokeWidth={2} dot={false} name={t('chart.actual')} />
              )}
              {showBenchmark && (
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="var(--chart-series-b)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name={t('chart.benchmark')}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <DashboardAnomaliesPanel role={role} />
    </section>
  )
}
