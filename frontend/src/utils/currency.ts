const rwfFormatter = new Intl.NumberFormat('en-RW', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

/** Display RWF with thousand separators, e.g. 12500 → "12,500 RWF". */
export function formatRwf(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '0 RWF'
  }
  return `${rwfFormatter.format(Math.round(amount))} RWF`
}

/** Strip formatting for numeric input → number. */
export function parseRwfInput(value: string): number {
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) {
    return 0
  }
  const parsed = Number.parseInt(digits, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Format while typing (digits only, with separators). */
export function formatRwfInput(value: string): string {
  const amount = parseRwfInput(value)
  if (amount === 0 && value.trim() === '') {
    return ''
  }
  return rwfFormatter.format(amount)
}
