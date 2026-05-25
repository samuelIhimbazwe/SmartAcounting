import { apiClient } from './client'
import { parseDashboardAlertLine } from '../alerts/alertUtils'
import type { AlertEvent, DashboardPayload, DateRange, KPIItem, TrendPoint } from '../types/dashboard'
import { roleApiMap, type Role } from '../types/roles'
import { roleChartWidgetMap } from './dashboardRoleConfig'

/** Backend returns List<KpiDto> as JSON array */
interface RawKpiDto {
  key?: string
  label?: string
  value?: string
  trend?: string
  status?: string
}

function parseTrendToSignedNumber(trendStr: string): number {
  const s = trendStr.trim()
  if (!s) {
    return 0
  }
  const neg = s.startsWith('-')
  const num = parseFloat(s.replace(/[^\d.-]/g, ''))
  if (Number.isNaN(num)) {
    return 0
  }
  return neg ? -Math.abs(num) : Math.abs(num)
}

function inferFormatFromStrings(valueStr: string, key: string, label: string): KPIItem['format'] {
  const combined = `${key} ${label} ${valueStr}`.toLowerCase()
  if (combined.includes('day') || valueStr.toLowerCase().includes('day')) {
    return 'days'
  }
  if (valueStr.includes('%') || combined.includes('pct') || combined.includes('ratio') || combined.includes('rate')) {
    return 'percent'
  }
  if (
    combined.includes('revenue') ||
    combined.includes('cash') ||
    combined.includes('amount') ||
    combined.includes('cost')
  ) {
    return 'currency'
  }
  return 'number'
}

function parseNumericFromDisplay(valueStr: string, format: KPIItem['format']): number {
  const s = valueStr.trim().toLowerCase()
  if (format === 'percent') {
    return parseFloat(s.replace(/%/g, '')) || 0
  }
  if (format === 'days') {
    const m = s.match(/([\d.]+)/)
    return m ? parseFloat(m[1]) : 0
  }
  const cleaned = s.replace(/,/g, '')
  if (cleaned.endsWith('k')) {
    return (parseFloat(cleaned.slice(0, -1)) || 0) * 1000
  }
  if (cleaned.endsWith('m')) {
    return (parseFloat(cleaned.slice(0, -1)) || 0) * 1_000_000
  }
  const n = parseFloat(cleaned.replace(/[^\d.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

function normalizeFromKpiDtoArray(rows: RawKpiDto[]): KPIItem[] {
  return rows.map((row) => {
    const key = String(row.key ?? '')
    const label = String(row.label ?? key)
    const valueStr = String(row.value ?? '0')
    const trendStr = String(row.trend ?? '')
    const format = inferFormatFromStrings(valueStr, key, label)
    const value = parseNumericFromDisplay(valueStr, format)
    const trendNum = parseTrendToSignedNumber(trendStr)
    return {
      key,
      label,
      value,
      displayValue: valueStr,
      trend: trendNum,
      trendDisplay: trendStr || undefined,
      format,
      status: row.status ? String(row.status) : undefined,
    }
  })
}

/** Legacy object-shaped KPI payloads (tests / mocks). */
function normalizeKpisLegacy(input: Record<string, unknown>): KPIItem[] {
  return Object.entries(input)
    .filter(([, v]) => typeof v === 'number')
    .slice(0, 6)
    .map(([key, value]) => ({
      key,
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase()),
      value: Number(value),
      trend: 0,
      format:
        key.toLowerCase().includes('pct') || key.toLowerCase().includes('ratio') ? 'percent' : 'number',
    }))
}

function normalizeKpisPayload(data: unknown): KPIItem[] {
  if (Array.isArray(data)) {
    return normalizeFromKpiDtoArray(data as RawKpiDto[])
  }
  if (data && typeof data === 'object') {
    return normalizeKpisLegacy(data as Record<string, unknown>)
  }
  return []
}

export async function getDashboardAlerts(role: Role): Promise<AlertEvent[]> {
  const roleSegment = roleApiMap[role]
  const response = await apiClient.get<string[]>(`/api/v1/dashboards/${roleSegment}/alerts`)
  const rows = Array.isArray(response.data) ? response.data : []
  return rows.map((line) => parseDashboardAlertLine(line, role))
}

export interface DashboardAnomaly {
  id: string
  severity: string
  title: string
  details: string
}

export async function getDashboardAnomalies(role: Role): Promise<DashboardAnomaly[]> {
  const roleSegment = roleApiMap[role]
  const response = await apiClient.get<DashboardAnomaly[]>(`/api/v1/dashboards/${roleSegment}/anomalies`)
  return Array.isArray(response.data) ? response.data : []
}

export async function getDashboardPayload(role: Role, dateRange: DateRange): Promise<DashboardPayload> {
  const roleSegment = roleApiMap[role]
  const chartWidget = roleChartWidgetMap[role]
  const [kpiResponse, trendResponse] = await Promise.all([
    apiClient.get(`/api/v1/dashboards/${roleSegment}/kpis`, { params: dateRange }),
    apiClient.get(`/api/v1/dashboards/${roleSegment}/charts/${chartWidget}`, { params: dateRange }),
  ])

  const trendData = Array.isArray(trendResponse.data) ? trendResponse.data : []
  const values = trendData.map((point: Record<string, unknown>) => Number(point.value ?? point.amount ?? 0))
  const rollingAvg =
    values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
  const trend: TrendPoint[] = trendData.map((point: Record<string, unknown>, idx: number) => {
    const dateLabel = point.date != null ? String(point.date) : String(point.period ?? point.label ?? `P${idx + 1}`)
    return {
      period: dateLabel,
      value: Number(point.value ?? point.amount ?? 0),
      benchmark: Number(point.benchmark ?? point.target ?? rollingAvg),
    }
  })

  return {
    kpis: normalizeKpisPayload(kpiResponse.data),
    trend,
    chartWidget,
  }
}
