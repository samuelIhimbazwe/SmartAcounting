export type TaxType = 'INCLUSIVE' | 'EXCLUSIVE'
export type TaxAppliesTo = 'ALL' | 'CATEGORY' | 'PRODUCT'

export interface TaxConfig {
  id: string
  name: string
  rate: number
  type: TaxType
  appliesTo: TaxAppliesTo
  categoryCode?: string
}

export interface LineVatResult {
  net: number
  vat: number
  gross: number
}

export interface CartVatSummary {
  subtotalExVat: number
  totalVat: number
  totalInclVat: number
  taxExempt: boolean
  lines: Array<LineVatResult & { lineTotal: number }>
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function splitLineAmount(
  amount: number,
  taxType: TaxType,
  rate: number,
  taxExempt: boolean,
): LineVatResult {
  if (taxExempt || amount <= 0) {
    const g = round2(amount)
    return { net: g, vat: 0, gross: g }
  }
  const r = rate > 1 ? rate / 100 : rate
  if (taxType === 'INCLUSIVE') {
    const net = round2(amount / (1 + r))
    const vat = round2(amount - net)
    return { net, vat, gross: round2(amount) }
  }
  const net = round2(amount)
  const vat = round2(net * r)
  return { net, vat, gross: round2(net + vat) }
}

export function summarizeCart(
  lineTotals: number[],
  config: TaxConfig,
  taxExempt: boolean,
): CartVatSummary {
  const lines = lineTotals.map((lineTotal) => ({
    lineTotal,
    ...splitLineAmount(lineTotal, config.type, config.rate, taxExempt),
  }))
  const subtotalExVat = round2(lines.reduce((a, l) => a + l.net, 0))
  const totalVat = round2(lines.reduce((a, l) => a + l.vat, 0))
  const totalInclVat = round2(lines.reduce((a, l) => a + l.gross, 0))
  return { subtotalExVat, totalVat, totalInclVat, taxExempt, lines }
}

export const DEFAULT_RWANDA_VAT: TaxConfig = {
  id: 'default-rw-vat',
  name: 'Rwanda VAT 18%',
  rate: 0.18,
  type: 'INCLUSIVE',
  appliesTo: 'ALL',
}
