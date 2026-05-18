import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { formatKpiValue } from '../../utils/format'

interface KpiCardProps {
  label: string
  value: number
  trend: number
  format: 'currency' | 'percent' | 'number' | 'days'
  displayValue?: string
  trendDisplay?: string
  status?: string
}

export function KpiCard({
  label,
  value,
  trend,
  format,
  displayValue,
  trendDisplay,
}: KpiCardProps) {
  const trendGood = trend >= 0

  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-[var(--shadow-card)]">
      <p className="m-0 text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="m-0 mt-2 font-[var(--font-display)] text-2xl font-bold text-neutral-900">
        {displayValue ?? formatKpiValue(value, format)}
      </p>
      <div
        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
          trendGood
            ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]'
            : 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]'
        }`}
      >
        {trendGood ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {trendDisplay ?? `${Math.abs(trend).toFixed(1)}%`}
      </div>
    </article>
  )
}
