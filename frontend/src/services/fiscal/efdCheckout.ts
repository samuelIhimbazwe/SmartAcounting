import type { PosTenderDto } from '../../shared/api/pos'
import { DEFAULT_RWANDA_VAT, splitLineAmount } from './vatEngine'
import type { EfdSalePayload } from './efd'

export interface EfdCheckoutItem {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

/** POS-facing fiscal payload (queued and mapped to {@link EfdSalePayload} for the API). */
export interface EfdCheckoutPayload {
  salesOrderId: string
  receiptNumber: string
  tin: string
  items: EfdCheckoutItem[]
  totalAmount: number
  vatAmount: number
  paymentMethod: string
  timestamp: string
  currencyCode: string
  taxExempt?: boolean
}

export interface PosCartLineForEfd {
  displayName: string
  displayUnit: string
  quantity: number
}

export function resolveRraTin(): string {
  return import.meta.env.VITE_RRA_TIN?.trim() || '000000000'
}

export function formatPosPaymentMethod(tenders: PosTenderDto[]): string {
  const active = tenders.filter((t) => Number(t.amount || '0') > 0).map((t) => t.tenderType)
  return active.length > 0 ? active.join('+') : 'UNKNOWN'
}

export function buildPosEfdCheckoutPayload(params: {
  salesOrderId: string
  receiptNumber: string
  cartLines: PosCartLineForEfd[]
  tenders: PosTenderDto[]
  currencyCode: string
  totalAmount: number
  taxExempt?: boolean
  timestamp?: string
}): EfdCheckoutPayload {
  const taxExempt = params.taxExempt ?? false
  const vatRate = DEFAULT_RWANDA_VAT.rate > 1 ? DEFAULT_RWANDA_VAT.rate / 100 : DEFAULT_RWANDA_VAT.rate

  const items: EfdCheckoutItem[] = params.cartLines.map((line) => ({
    description: line.displayName,
    quantity: line.quantity,
    unitPrice: Number(line.displayUnit),
    vatRate,
  }))

  let vatAmount = 0
  if (!taxExempt) {
    for (const line of params.cartLines) {
      const lineTotal = Number(line.displayUnit) * line.quantity
      const split = splitLineAmount(lineTotal, DEFAULT_RWANDA_VAT.type, DEFAULT_RWANDA_VAT.rate, false)
      vatAmount += split.vat
    }
    vatAmount = Math.round(vatAmount * 100) / 100
  }

  return {
    salesOrderId: params.salesOrderId,
    receiptNumber: params.receiptNumber,
    tin: resolveRraTin(),
    items,
    totalAmount: params.totalAmount,
    vatAmount,
    paymentMethod: formatPosPaymentMethod(params.tenders),
    timestamp: params.timestamp ?? new Date().toISOString(),
    currencyCode: params.currencyCode,
    taxExempt,
  }
}

export function efdCheckoutToSalePayload(checkout: EfdCheckoutPayload): EfdSalePayload {
  return {
    salesOrderId: checkout.salesOrderId,
    grossAmount: checkout.totalAmount,
    vatAmount: checkout.vatAmount,
    currencyCode: checkout.currencyCode,
    taxExempt: checkout.taxExempt ?? false,
    lines: checkout.items.map((item) => {
      const lineTotal = item.unitPrice * item.quantity
      const split = splitLineAmount(
        lineTotal,
        DEFAULT_RWANDA_VAT.type,
        item.vatRate,
        checkout.taxExempt ?? false,
      )
      return {
        name: item.description,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        vat: split.vat,
      }
    }),
  }
}
