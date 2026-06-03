import type { StatTrend } from '../../../components/ui'
import type { KPIItem } from '../../../shared/types/dashboard'
import { formatKpiValue } from '../../../shared/utils/format'
import { formatNumber } from '../../../shared/utils/intl'

/** RWF with grouped thousands — e.g. RWF 1,234,567 */
export function formatRwf(amount: number): string {
  const formatted = formatNumber(Math.round(amount))
  return `RWF ${formatted}`
}

export function formatDashboardKpiValue(kpi: KPIItem): string {
  if (kpi.displayValue?.trim()) {
    const raw = kpi.displayValue.trim()
    if (kpi.format === 'currency') {
      if (/^rwf/i.test(raw)) {
        return raw.replace(/^rwf\s*/i, 'RWF ')
      }
      if (/^\d|^[+-]?\d/.test(raw.replace(/,/g, ''))) {
        return formatRwf(kpi.value)
      }
    }
    return raw
  }
  if (kpi.format === 'currency') {
    return formatRwf(kpi.value)
  }
  return formatKpiValue(kpi.value, kpi.format)
}

export function kpiTrendMeta(kpi: KPIItem): { change: string; trend: StatTrend } {
  const raw = (kpi.trendDisplay ?? '').trim()
  if (raw) {
    const lower = raw.toLowerCase()
    const isDown =
      raw.startsWith('-') ||
      lower.includes('down') ||
      lower.includes('↓') ||
      (kpi.trend < 0 && !raw.startsWith('+'))
    const isUp = raw.startsWith('+') || lower.includes('up') || lower.includes('↑') || kpi.trend > 0
    const trend: StatTrend = isDown ? 'down' : isUp ? 'up' : 'flat'
    const change = raw.startsWith('+') || raw.startsWith('-') ? raw : isUp ? `+${raw}` : raw
    return { change, trend }
  }
  if (kpi.trend === 0) {
    return { change: '—', trend: 'flat' }
  }
  const sign = kpi.trend > 0 ? '+' : ''
  return {
    change: `${sign}${kpi.trend.toFixed(1)}%`,
    trend: kpi.trend > 0 ? 'up' : 'down',
  }
}

export function matchesKpiHints(kpi: KPIItem, hints: string[]): boolean {
  const blob = `${kpi.key ?? ''} ${kpi.label}`.toLowerCase()
  return hints.some((h) => blob.includes(h.toLowerCase()))
}

export function pickKpiForSlot(kpis: KPIItem[], hints: string[], fallbackIndex: number): KPIItem | undefined {
  const direct = kpis.find((row) => matchesKpiHints(row, hints))
  return direct ?? kpis[fallbackIndex]
}
