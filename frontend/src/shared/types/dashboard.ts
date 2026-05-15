export interface DateRange {
  from: string
  to: string
}

export interface KPIItem {
  /** Backend KPI key when provided */
  key?: string
  label: string
  value: number
  /** Raw formatted value from API when present (e.g. "12.4%", "74 days") */
  displayValue?: string
  trend: number
  /** Raw trend string from API (e.g. "+1.8%", "-4 days") */
  trendDisplay?: string
  format: 'currency' | 'percent' | 'number' | 'days'
  /** GREEN | AMBER | RED from backend */
  status?: string
}

export interface TrendPoint {
  period: string
  value: number
  benchmark?: number
}

export interface DashboardPayload {
  kpis: KPIItem[]
  trend: TrendPoint[]
  chartWidget?: string
}

export interface DrilldownRow {
  id: string
  entity: string
  amount: number
  status: string
  date: string
}

export interface RecommendedAction {
  id: string
  type: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface AlertEvent {
  id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  role: string
  timestamp: string
}
