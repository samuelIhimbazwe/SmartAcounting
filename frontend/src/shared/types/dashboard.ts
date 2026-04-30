export interface DateRange {
  from: string
  to: string
}

export interface KPIItem {
  label: string
  value: number
  trend: number
  format: 'currency' | 'percent' | 'number' | 'days'
}

export interface TrendPoint {
  period: string
  value: number
  benchmark?: number
}

export interface DashboardPayload {
  kpis: KPIItem[]
  trend: TrendPoint[]
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
