import { apiClient } from './client'
import type { DashboardPayload, DateRange, KPIItem, TrendPoint } from '../types/dashboard'
import { roleApiMap, type Role } from '../types/roles'

function normalizeKpis(input: Record<string, unknown>): KPIItem[] {
  return Object.entries(input)
    .filter(([, value]) => typeof value === 'number')
    .slice(0, 6)
    .map(([key, value]) => ({
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase()),
      value: Number(value),
      trend: (Math.random() - 0.4) * 12,
      format: key.toLowerCase().includes('pct') || key.toLowerCase().includes('ratio') ? 'percent' : 'number',
    }))
}

export async function getDashboardPayload(role: Role, dateRange: DateRange): Promise<DashboardPayload> {
  const roleSegment = roleApiMap[role]
  const [kpiResponse, trendResponse] = await Promise.all([
    apiClient.get(`/api/v1/dashboards/${roleSegment}/kpis`, { params: dateRange }),
    apiClient.get(`/api/v1/dashboards/${roleSegment}/charts/revenue`, { params: dateRange }),
  ])

  const trendData = Array.isArray(trendResponse.data) ? trendResponse.data : []
  const trend: TrendPoint[] = trendData.map((point: Record<string, unknown>, idx: number) => ({
    period: String(point.period ?? point.label ?? `P${idx + 1}`),
    value: Number(point.value ?? point.amount ?? 0),
    benchmark: Number(point.benchmark ?? point.target ?? 0),
  }))

  return {
    kpis: normalizeKpis(kpiResponse.data as Record<string, unknown>),
    trend,
  }
}
