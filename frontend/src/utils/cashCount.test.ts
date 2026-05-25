import { describe, expect, it } from 'vitest'
import { computeCashCountTotal } from './cashCount'

describe('computeCashCountTotal', () => {
  it('returns zero when all quantities are empty', () => {
    expect(computeCashCountTotal({})).toBe(0)
  })

  it('sums coins and notes by denomination', () => {
    expect(
      computeCashCountTotal({
        c1: '10',
        c5: '2',
        n1000: '3',
        n5000: '1',
      }),
    ).toBe(10 * 1 + 2 * 5 + 3 * 1000 + 1 * 5000)
  })

  it('ignores formatted quantity strings', () => {
    expect(
      computeCashCountTotal({
        n2000: '1,000',
      }),
    ).toBe(2000 * 1000)
  })
})
