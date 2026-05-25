import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RWANDA_VAT,
  splitLineAmount,
  summarizeCart,
  type LineVatResult,
} from './vatEngine'

const round2 = (n: number) => Math.round(n * 100) / 100

interface BasketLine {
  gross: number
  vatRate: number
}

function buildInvoice(lines: BasketLine[]): {
  lineItems: Array<LineVatResult & { vatAmount: number }>
  totalVatAmount: number
} {
  const lineItems = lines.map(({ gross, vatRate }) => {
    const split = splitLineAmount(gross, 'INCLUSIVE', vatRate, false)
    return { ...split, vatAmount: split.vat }
  })
  const totalVatAmount = round2(lineItems.reduce((sum, line) => sum + line.vatAmount, 0))
  return { lineItems, totalVatAmount }
}

function assertVatReconciled(
  lineItems: Array<{ vatAmount: number }>,
  totalVatAmount: number,
  toleranceRwf = 1,
): void {
  const lineSum = round2(lineItems.reduce((sum, line) => sum + line.vatAmount, 0))
  expect(Math.abs(lineSum - totalVatAmount)).toBeLessThanOrEqual(toleranceRwf)
}

describe('vatEngine — Rwanda 18% VAT', () => {
  it('splits inclusive line at 18% (1000 gross → net + vat)', () => {
    const line = splitLineAmount(1000, 'INCLUSIVE', 0.18, false)
    expect(line.gross).toBe(1000)
    expect(line.net).toBe(847.46)
    expect(line.vat).toBe(152.54)
    expect(line.net + line.vat).toBe(1000)
  })

  it('summarizes cart with DEFAULT_RWANDA_VAT', () => {
    const summary = summarizeCart([1000, 500], DEFAULT_RWANDA_VAT, false)
    expect(summary.taxExempt).toBe(false)
    expect(summary.totalVat).toBe(228.81)
    expect(summary.totalInclVat).toBe(1500)
    expect(summary.subtotalExVat).toBe(1271.19)
  })

  it('returns zero VAT when tax exempt', () => {
    const line = splitLineAmount(1000, 'INCLUSIVE', 0.18, true)
    expect(line.vat).toBe(0)
    expect(line.gross).toBe(1000)
  })
})

describe('vatEngine — edge cases', () => {
  it('zero-rated item: vatRate=0 contributes 0 VAT', () => {
    const line = splitLineAmount(2500, 'INCLUSIVE', 0, false)
    expect(line.vat).toBe(0)
    expect(line.net).toBe(2500)
    expect(line.gross).toBe(2500)
  })

  it('mixed basket: 18% and zero-rated — total VAT equals sum of 18% lines only', () => {
    const standard = splitLineAmount(1180, 'INCLUSIVE', 0.18, false)
    const zeroRated = splitLineAmount(500, 'INCLUSIVE', 0, false)
    expect(zeroRated.vat).toBe(0)

    const invoice = buildInvoice([
      { gross: 1180, vatRate: 0.18 },
      { gross: 500, vatRate: 0 },
    ])
    expect(invoice.totalVatAmount).toBe(standard.vat)
    expect(invoice.lineItems[1].vatAmount).toBe(0)
    assertVatReconciled(invoice.lineItems, invoice.totalVatAmount)
  })

  it('rounding reconciliation: line VAT sum matches invoice total within 1 RWF', () => {
    const invoice = buildInvoice([
      { gross: 1000, vatRate: 0.18 },
      { gross: 333, vatRate: 0.18 },
      { gross: 777, vatRate: 0.18 },
      { gross: 120, vatRate: 0 },
    ])
    assertVatReconciled(invoice.lineItems, invoice.totalVatAmount, 1)
  })

  it('large basket: 50 random lines — no floating-point drift beyond 1 RWF', () => {
    let seed = 42
    const next = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }

    const lines: BasketLine[] = Array.from({ length: 50 }, (_, i) => ({
      gross: Math.round(50 + next() * 9950),
      vatRate: i % 5 === 0 ? 0 : 0.18,
    }))

    const invoice = buildInvoice(lines)
    assertVatReconciled(invoice.lineItems, invoice.totalVatAmount, 1)
    expect(invoice.lineItems).toHaveLength(50)
  })
})
