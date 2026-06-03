import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  aggregateSummary,
  buildHeatmapGrid,
  cashierRating,
  fetchCashierPerformance,
  fetchLostSales,
  fetchSalesHeatmap,
  periodRange,
  type CashierPerformanceRow,
  type LostSalesSummary,
  type SalesAnalyticsPeriod,
} from '../../shared/api/salesAnalytics'
import { normalizeApiError } from '../../shared/api/errors'
import { Button } from '../../shared/components/ui/Button'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

const PERIODS: { id: SalesAnalyticsPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
]

function moneyRwf(amount: number) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(
    amount,
  )
}

function dayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function heatColor(value: number, max: number): string {
  if (value <= 0) return 'rgb(241 245 249)'
  const t = value / max
  const r = Math.round(224 - t * 120)
  const g = Math.round(231 - t * 60)
  const b = Math.round(255 - t * 100)
  return `rgb(${r} ${g} ${b})`
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
    </article>
  )
}

export function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<SalesAnalyticsPeriod>('month')
  const [cashiers, setCashiers] = useState<CashierPerformanceRow[]>([])
  const [heatmapCells, setHeatmapCells] = useState<Awaited<ReturnType<typeof fetchSalesHeatmap>>>([])
  const [lost, setLost] = useState<LostSalesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => periodRange(period), [period])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cashierRows, heatmap, lostSales] = await Promise.all([
        fetchCashierPerformance(range.from, range.to),
        fetchSalesHeatmap(range.from, range.to),
        fetchLostSales(range.from, range.to),
      ])
      setCashiers(cashierRows)
      setHeatmapCells(heatmap)
      setLost(lostSales)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(() => aggregateSummary(cashiers), [cashiers])
  const heatmap = useMemo(
    () => buildHeatmapGrid(heatmapCells, range.from, range.to),
    [heatmapCells, range.from, range.to],
  )

  const hourlyChartData = useMemo(() => {
    const totals = Array.from({ length: 24 }, () => 0)
    for (const cell of heatmapCells) {
      if (cell.hourOfDay >= 0 && cell.hourOfDay < 24) {
        totals[cell.hourOfDay] += cell.transactionCount
      }
    }
    return totals.map((count, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      count,
    }))
  }, [heatmapCells])

  const lostChartData = useMemo(
    () =>
      (lost?.byProduct ?? []).slice(0, 8).map(p => ({
        name: p.productName.length > 18 ? `${p.productName.slice(0, 18)}…` : p.productName,
        revenue: p.estimatedLostRevenue,
        occurrences: p.occurrences,
      })),
    [lost?.byProduct],
  )

  const missedLookups = useMemo(() => {
    const products = lost?.byProduct ?? []
    return [...products].sort((a, b) => b.occurrences - a.occurrences).slice(0, 6)
  }, [lost?.byProduct])

  const stockoutCandidates = useMemo(() => {
    const products = lost?.byProduct ?? []
    return [...products]
      .filter(p => p.occurrences >= 2)
      .sort((a, b) => b.estimatedLostRevenue - a.estimatedLostRevenue)
      .slice(0, 6)
  }, [lost?.byProduct])

  if (loading && cashiers.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="page-stack">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-brand-800)]">
            <BarChart3 className="h-5 w-5" aria-hidden />
            <h1 className="text-xl font-semibold text-neutral-900">Sales analytics</h1>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Cashier performance, peak hours, and lost sales for {range.label.toLowerCase()}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <Button
              key={p.id}
              type="button"
              variant={period === p.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-800">Summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total revenue" value={moneyRwf(summary.totalRevenue)} />
          <SummaryCard label="Total transactions" value={String(summary.totalTransactions)} />
          <SummaryCard label="Average basket" value={moneyRwf(summary.avgBasket)} />
          <SummaryCard label="Top cashier" value={summary.topCashier} />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-800">Cashier performance</h2>
        <p className="mt-1 text-xs text-neutral-500">Sorted by revenue (highest first).</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">Cashier</th>
                <th className="px-3 py-2 font-medium">Sales count</th>
                <th className="px-3 py-2 font-medium">Revenue</th>
                <th className="px-3 py-2 font-medium">Avg basket</th>
                <th className="px-3 py-2 font-medium">Voids</th>
                <th className="px-3 py-2 font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {cashiers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                    No cashier activity in this period.
                  </td>
                </tr>
              ) : (
                cashiers.map(row => {
                  const avg = row.transactionCount > 0 ? row.totalSales / row.transactionCount : 0
                  const rating = cashierRating(row)
                  return (
                    <tr key={row.cashierId} className="border-b border-neutral-100 last:border-0">
                      <td className="px-3 py-2 font-medium text-neutral-900">{row.cashierName}</td>
                      <td className="px-3 py-2 text-neutral-700">{row.transactionCount}</td>
                      <td className="px-3 py-2 text-neutral-700">{moneyRwf(row.totalSales)}</td>
                      <td className="px-3 py-2 text-neutral-700">{moneyRwf(avg)}</td>
                      <td className="px-3 py-2 text-neutral-700">{row.totalVoids}</td>
                      <td className="px-3 py-2 text-neutral-700">{rating.toFixed(1)} / 5</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-800">Sales heatmap</h2>
        <p className="mt-1 text-xs text-neutral-500">7 days × 24 hours — darker cells mean more transactions.</p>
        <div className="mt-4 overflow-x-auto">
          <div className="inline-block min-w-[640px]">
            <div className="mb-1 grid grid-cols-[72px_repeat(24,minmax(18px,1fr))] gap-0.5 text-[10px] text-neutral-500">
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-center">
                  {h % 3 === 0 ? h : ''}
                </div>
              ))}
            </div>
            {heatmap.days.map((day, rowIdx) => (
              <div
                key={day}
                className="mb-0.5 grid grid-cols-[72px_repeat(24,minmax(18px,1fr))] gap-0.5 items-center"
              >
                <div className="truncate pr-1 text-xs text-neutral-600">{dayLabel(day)}</div>
                {heatmap.grid[rowIdx]?.map((value, hour) => (
                  <div
                    key={`${day}-${hour}`}
                    title={`${dayLabel(day)} ${hour}:00 — ${value} transactions`}
                    className="h-5 rounded-sm border border-neutral-100"
                    style={{ backgroundColor: heatColor(value, heatmap.max) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Transactions" fill="var(--color-brand-700)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-800">Lost sales</h2>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You may have lost <strong>{moneyRwf(lost?.totalLostRevenue ?? 0)}</strong> in potential sales (
          {lost?.occurrenceCount ?? 0} missed attempts).
        </p>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Searched but not found
            </h3>
            <ul className="mt-2 space-y-2 text-sm">
              {missedLookups.length === 0 ? (
                <li className="text-neutral-500">No missed lookups recorded.</li>
              ) : (
                missedLookups.map(p => (
                  <li key={`${p.sku ?? p.productName}-miss`} className="flex justify-between gap-2">
                    <span>
                      {p.productName}
                      {p.sku ? <span className="ml-1 text-neutral-500">({p.sku})</span> : null}
                    </span>
                    <span className="text-neutral-600">{p.occurrences}×</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              High demand / stock pressure
            </h3>
            <ul className="mt-2 space-y-2 text-sm">
              {stockoutCandidates.length === 0 ? (
                <li className="text-neutral-500">No repeat stock-out signals in this period.</li>
              ) : (
                stockoutCandidates.map(p => (
                  <li key={`${p.sku ?? p.productName}-stock`} className="flex justify-between gap-2">
                    <span>{p.productName}</span>
                    <span className="font-medium text-neutral-800">{moneyRwf(p.estimatedLostRevenue)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {lostChartData.length > 0 ? (
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lostChartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(Number(v) / 1000)}k`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => moneyRwf(Number(v ?? 0))} />
                <Bar dataKey="revenue" name="Est. lost RWF" radius={[0, 4, 4, 0]}>
                  {lostChartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#b45309' : '#d97706'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </section>
    </div>
  )
}
