import { apiClient } from './client'

export type SalesAnalyticsPeriod = 'today' | 'week' | 'month'

export interface CashierPerformanceRow {
  cashierId: string
  cashierName: string
  transactionCount: number
  totalSales: number
  totalVoids: number
  totalRefunds: number
  refundAmount: number
}

export interface HourlyHeatmapCell {
  saleDate: string
  hourOfDay: number
  transactionCount: number
  totalSales: number
}

export interface LostSalesProductRow {
  productName: string
  sku?: string | null
  occurrences: number
  estimatedLostRevenue: number
}

export interface LostSalesSummary {
  from: string
  to: string
  totalLostRevenue: number
  occurrenceCount: number
  byProduct: LostSalesProductRow[]
}

function num(v: unknown): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function periodRange(period: SalesAnalyticsPeriod): { from: string; to: string; label: string } {
  const today = new Date()
  const to = today.toISOString().slice(0, 10)
  if (period === 'today') {
    return { from: to, to, label: 'Today' }
  }
  if (period === 'week') {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    return { from: start.toISOString().slice(0, 10), to, label: 'This week' }
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return { from: start.toISOString().slice(0, 10), to, label: 'This month' }
}

function mapCashier(row: Record<string, unknown>): CashierPerformanceRow {
  const sales = num(row.totalSales)
  const count = num(row.transactionCount)
  return {
    cashierId: String(row.cashierId ?? ''),
    cashierName: String(row.cashierName ?? row.cashierId ?? 'Cashier'),
    transactionCount: count,
    totalSales: sales,
    totalVoids: num(row.totalVoids),
    totalRefunds: num(row.totalRefunds),
    refundAmount: num(row.refundAmount),
  }
}

function mapHeatmapCell(row: Record<string, unknown>): HourlyHeatmapCell {
  const date = row.saleDate != null ? String(row.saleDate).slice(0, 10) : ''
  return {
    saleDate: date,
    hourOfDay: num(row.hourOfDay),
    transactionCount: num(row.transactionCount),
    totalSales: num(row.totalSales),
  }
}

function mapLostProduct(row: Record<string, unknown>): LostSalesProductRow {
  return {
    productName: String(row.productName ?? 'Unknown'),
    sku: row.sku != null ? String(row.sku) : null,
    occurrences: num(row.occurrences),
    estimatedLostRevenue: num(row.estimatedLostRevenue),
  }
}

export async function fetchCashierPerformance(from: string, to: string): Promise<CashierPerformanceRow[]> {
  const { data } = await apiClient.get<Array<Record<string, unknown>>>('/api/v1/sales/analytics/cashier-performance', {
    params: { from, to },
  })
  if (!Array.isArray(data)) return []
  return data.map(mapCashier).sort((a, b) => b.totalSales - a.totalSales)
}

export async function fetchSalesHeatmap(from: string, to: string): Promise<HourlyHeatmapCell[]> {
  const { data } = await apiClient.get<Array<Record<string, unknown>>>('/api/v1/sales/analytics/heatmap', {
    params: { from, to },
  })
  return Array.isArray(data) ? data.map(mapHeatmapCell) : []
}

export async function fetchLostSales(from: string, to: string): Promise<LostSalesSummary> {
  const { data } = await apiClient.get<Record<string, unknown>>('/api/v1/sales/analytics/lost-sales', {
    params: { from, to },
  })
  return {
    from: String(data.from ?? from).slice(0, 10),
    to: String(data.to ?? to).slice(0, 10),
    totalLostRevenue: num(data.totalLostRevenue),
    occurrenceCount: num(data.occurrenceCount),
    byProduct: Array.isArray(data.byProduct)
      ? data.byProduct.map(r => mapLostProduct(r as Record<string, unknown>))
      : [],
  }
}

export function aggregateSummary(cashiers: CashierPerformanceRow[]) {
  const totalRevenue = cashiers.reduce((s, c) => s + c.totalSales, 0)
  const totalTransactions = cashiers.reduce((s, c) => s + c.transactionCount, 0)
  const avgBasket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  const topCashier = cashiers[0]?.cashierName ?? '—'
  return { totalRevenue, totalTransactions, avgBasket, topCashier }
}

export function cashierRating(row: CashierPerformanceRow): number {
  const count = Math.max(row.transactionCount, 1)
  const voidRate = row.totalVoids / count
  const refundRate = row.totalRefunds / count
  const score = 5 - voidRate * 15 - refundRate * 8
  return Math.max(1, Math.min(5, Math.round(score * 10) / 10))
}

export function buildHeatmapGrid(cells: HourlyHeatmapCell[], from: string, to: string) {
  const start = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  const days: string[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10))
  }
  const lookup = new Map<string, number>()
  let max = 0
  for (const cell of cells) {
    const key = `${cell.saleDate}|${cell.hourOfDay}`
    const v = cell.transactionCount
    lookup.set(key, v)
    if (v > max) max = v
  }
  const grid = days.map(day =>
    Array.from({ length: 24 }, (_, hour) => lookup.get(`${day}|${hour}`) ?? 0),
  )
  return { days, grid, max: max || 1 }
}
