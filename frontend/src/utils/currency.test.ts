import { describe, expect, it } from 'vitest'
import { formatRwf, formatRwfInput, parseRwfInput } from './currency'

describe('formatRwf', () => {
  it('formats whole RWF with thousand separators and suffix', () => {
    expect(formatRwf(12500)).toBe('12,500 RWF')
    expect(formatRwf(0)).toBe('0 RWF')
    expect(formatRwf(1000000)).toBe('1,000,000 RWF')
  })

  it('rounds fractional amounts', () => {
    expect(formatRwf(12500.6)).toBe('12,501 RWF')
  })

  it('returns zero for non-finite values', () => {
    expect(formatRwf(Number.NaN)).toBe('0 RWF')
    expect(formatRwf(Number.POSITIVE_INFINITY)).toBe('0 RWF')
  })
})

describe('parseRwfInput', () => {
  it('strips separators and non-digits', () => {
    expect(parseRwfInput('12,500')).toBe(12500)
    expect(parseRwfInput('12 500 RWF')).toBe(12500)
  })

  it('returns 0 for empty input', () => {
    expect(parseRwfInput('')).toBe(0)
    expect(parseRwfInput('   ')).toBe(0)
  })
})

describe('formatRwfInput', () => {
  it('formats digits with separators while typing', () => {
    expect(formatRwfInput('12500')).toBe('12,500')
  })

  it('returns empty string when field is cleared', () => {
    expect(formatRwfInput('')).toBe('')
    expect(formatRwfInput('   ')).toBe('')
  })
})
