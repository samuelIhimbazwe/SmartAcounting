import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** First character upper, rest lower — for badge labels. */
export function sentenceCase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

export function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return true
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.replace(/,/g, ''))
    return Number.isFinite(n)
  }
  return false
}
