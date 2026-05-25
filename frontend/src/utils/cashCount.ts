import { parseRwfInput } from './currency'

export const TILL_COINS = [1, 5, 10, 20, 50] as const
export const TILL_NOTES = [100, 200, 500, 1000, 2000, 5000] as const

/** Sum denomination quantities (keys: c1, c5, … n5000) to RWF total. */
export function computeCashCountTotal(quantities: Record<string, string>): number {
  let sum = 0
  for (const coin of TILL_COINS) {
    const qty = parseRwfInput(quantities[`c${coin}`] ?? '0')
    sum += coin * qty
  }
  for (const note of TILL_NOTES) {
    const qty = parseRwfInput(quantities[`n${note}`] ?? '0')
    sum += note * qty
  }
  return sum
}
