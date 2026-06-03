import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { cn } from './utils'

export type StatTrend = 'up' | 'down' | 'flat'

export interface StatCardProps {
  label: string
  value: string | number
  change?: string
  trend?: StatTrend
  prefix?: string
  sparklineData?: number[]
  className?: string
}

export function StatCard({
  label,
  value,
  change,
  trend = 'flat',
  prefix,
  sparklineData,
  className,
}: StatCardProps) {
  const chartData = (sparklineData ?? []).map((v, i) => ({ i, v }))
  const TrendIcon =
    trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : ArrowRight

  return (
    <article className={cn('ui-stat-card', className)}>
      <p className="ui-stat-card__label">{label}</p>
      <div className="ui-stat-card__value-row">
        {prefix ? <span className="ui-stat-card__prefix">{prefix}</span> : null}
        <p className="ui-stat-card__value num">{value}</p>
      </div>
      {change ? (
        <span className={cn('ui-stat-card__change', `ui-stat-card__change--${trend}`)}>
          <TrendIcon size={14} aria-hidden />
          {change}
        </span>
      ) : null}
      {chartData.length > 1 ? (
        <div className="ui-stat-card__sparkline" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </article>
  )
}
