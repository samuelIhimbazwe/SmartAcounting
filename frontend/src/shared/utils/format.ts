import { formatCurrency, formatNumber, formatPercent } from './intl'

export function formatKpiValue(value: number, format: 'currency' | 'percent' | 'number' | 'days') {
  if (format === 'currency') {
    return formatCurrency(value)
  }

  if (format === 'percent') {
    return formatPercent(value, 1)
  }

  if (format === 'days') {
    return `${Math.round(value)} days`
  }

  return formatNumber(value)
}
