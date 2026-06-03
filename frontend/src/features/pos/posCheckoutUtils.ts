import type { PosCatalogItemDto } from '../../shared/api/pos'
import { formatNumber } from '../../shared/utils/intl'

export const POS_RECENT_KEY = 'pos-recent-products'
export const POS_MOMO_PHONE_KEY = 'pos-momo-phone'
const RECENT_MAX = 12

export type RecentProduct = {
  barcode: string
  displayName: string
  unitPrice: string
  currencyCode: string
}

export type TenderChoice = 'CASH' | 'MOMO' | 'AIRTEL_MONEY' | 'CARD' | 'ON_ACCOUNT'

export function loadRecentProducts(): RecentProduct[] {
  try {
    const raw = localStorage.getItem(POS_RECENT_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as RecentProduct[]
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

export function saveRecentProduct(item: PosCatalogItemDto) {
  const entry: RecentProduct = {
    barcode: item.barcode,
    displayName: item.displayName,
    unitPrice: item.unitPrice,
    currencyCode: item.currencyCode,
  }
  const prev = loadRecentProducts().filter((r) => r.barcode !== entry.barcode)
  localStorage.setItem(POS_RECENT_KEY, JSON.stringify([entry, ...prev].slice(0, RECENT_MAX)))
}

export function formatPosMoney(amount: string | number, currencyCode: string): string {
  const n = Number(amount)
  const formatted = formatNumber(Number.isFinite(n) ? Math.round(n) : 0)
  return `${currencyCode} ${formatted}`
}

export function vatBreakdownIncl(grossTotal: string) {
  const gross = Number(grossTotal) || 0
  const subtotal = gross / 1.18
  const vat = gross - subtotal
  return {
    subtotal: subtotal.toFixed(2),
    vat: vat.toFixed(2),
    total: gross.toFixed(2),
  }
}

export type StockLevel = 'ok' | 'low' | 'out'

export function stockBadgeVariant(level: StockLevel): 'success' | 'warning' | 'error' {
  if (level === 'low') {
    return 'warning'
  }
  if (level === 'out') {
    return 'error'
  }
  return 'success'
}
