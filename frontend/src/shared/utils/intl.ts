import { useIntlStore } from '../stores/intlStore'

function getIntlPreferences() {
  const { locale, currency } = useIntlStore.getState()
  return {
    locale: locale || 'en',
    currency: currency || 'USD',
  }
}

export function formatCurrency(value: number) {
  const { locale, currency } = getIntlPreferences()
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number) {
  const { locale } = getIntlPreferences()
  return new Intl.NumberFormat(locale).format(value)
}

export function formatPercent(value: number, fractionDigits = 1) {
  const { locale } = getIntlPreferences()
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100)
}

export function formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  const { locale } = getIntlPreferences()
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(
    locale,
    options ?? {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  ).format(date)
}
