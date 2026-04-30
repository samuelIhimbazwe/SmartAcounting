import { apiClient } from './client'
import type { DrilldownRow } from '../types/dashboard'
import type { DateRange } from '../types/dashboard'
import { roleApiMap, type Role } from '../types/roles'

export interface DrilldownQuery {
  page: number
  size: number
}

export interface DrilldownResult {
  rows: DrilldownRow[]
  total: number
}

type DrilldownResponse = DrilldownRow[] | { content?: DrilldownRow[]; totalElements?: number }

function fallbackRows(metric: string, size: number): DrilldownRow[] {
  return Array.from({ length: Math.max(1, size) }, (_, idx) => ({
    id: `${metric}-${idx + 1}`,
    entity: `Entity ${idx + 1}`,
    amount: Math.round(20_000 + Math.random() * 80_000),
    status: idx % 3 === 0 ? 'At Risk' : 'Healthy',
    date: new Date(Date.now() - idx * 86_400_000).toISOString().slice(0, 10),
  }))
}

function normalizeRows(data: DrilldownResponse): DrilldownResult {
  if (Array.isArray(data)) {
    return { rows: data, total: data.length }
  }
  const rows = data.content ?? []
  return { rows, total: data.totalElements ?? rows.length }
}

export async function getDrilldownRows(role: Role, widget: string, dateRange: DateRange, query: DrilldownQuery) {
  const roleSegment = roleApiMap[role]
  try {
    const response = await apiClient.get<DrilldownResponse>(
      `/api/v1/dashboards/${roleSegment}/charts/${widget}/drilldown`,
      { params: { ...dateRange, page: query.page, size: query.size } },
    )
    return normalizeRows(response.data)
  } catch {
    const rows = fallbackRows(widget, query.size)
    return { rows, total: rows.length }
  }
}
