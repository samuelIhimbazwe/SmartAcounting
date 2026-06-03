import { useMemo } from 'react'
import { Area, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '../../../components/ui'
import type { TrendPoint } from '../../../shared/types/dashboard'
import { formatRwf } from '../utils/dashboardFormat'

const CHART_HEIGHT = 280

interface DashboardRevenueChartProps {
  title: string
  subtitle?: string
  data: TrendPoint[]
  loading?: boolean
}

function formatAxisValue(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`
  }
  return String(Math.round(value))
}

export function DashboardRevenueChart({ title, subtitle, data, loading }: DashboardRevenueChartProps) {
  const { t } = useTranslation()
  const chartData = useMemo(
    () => data.map((p) => ({ period: p.period, value: p.value })),
    [data],
  )

  if (loading) {
    return (
      <article className="dash-chart">
        <Skeleton variant="text" width="40%" height={18} />
        <Skeleton variant="rect" height={CHART_HEIGHT} className="dash-chart__skeleton" />
      </article>
    )
  }

  if (chartData.length === 0) {
    return (
      <article className="dash-chart">
        <header className="dash-chart__head">
          <h3 className="dash-chart__title">{title}</h3>
          {subtitle ? <p className="dash-chart__subtitle">{subtitle}</p> : null}
        </header>
        <p className="dash-chart__empty">{t('dashboard.chartEmpty')}</p>
      </article>
    )
  }

  return (
    <article className="dash-chart">
      <header className="dash-chart__head">
        <h3 className="dash-chart__title">{title}</h3>
        {subtitle ? <p className="dash-chart__subtitle">{subtitle}</p> : null}
      </header>
      <div className="dash-chart__canvas" style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT} debounce={50}>
          <LineChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="dashRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 6" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatAxisValue}
              tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value) => [formatRwf(Number(value)), t('dashboard.chartValue')]}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill="url(#dashRevenueFill)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--color-primary)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
