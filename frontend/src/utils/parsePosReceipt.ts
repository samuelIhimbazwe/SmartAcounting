export interface ParsedPosReceiptLine {
  product: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface ParsedPosReceiptTender {
  type: string
  amount: number
  reference?: string
}

export interface ParsedPosReceipt {
  salesOrderId: string
  createdAt: string
  registerCode?: string
  lines: ParsedPosReceiptLine[]
  subtotal?: number
  vat?: number
  total?: number
  currency?: string
  tenders: ParsedPosReceiptTender[]
  fiscalSignature?: string
}

const LINE_ITEM_RE =
  /^\s*([\d.]+)\s+x\s+([\d.]+)\s+(\w+)\s*=\s*([\d.]+)\s*$/i

export function parsePosReceiptText(text: string): ParsedPosReceipt | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) {
    return null
  }

  let salesOrderId = ''
  let createdAt = ''
  let registerCode: string | undefined
  const items: ParsedPosReceiptLine[] = []
  const tenders: ParsedPosReceiptTender[] = []
  let subtotal: number | undefined
  let vat: number | undefined
  let total: number | undefined
  let currency: string | undefined
  let fiscalSignature: string | undefined
  let inPayments = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('Order:')) {
      salesOrderId = line.replace(/^Order:\s*/i, '').trim()
      continue
    }
    if (line.startsWith('Time:')) {
      createdAt = line.replace(/^Time:\s*/i, '').trim()
      continue
    }
    if (line.startsWith('Register:')) {
      registerCode = line.replace(/^Register:\s*/i, '').trim()
      continue
    }
    if (line.startsWith('Subtotal')) {
      const m = line.match(/([\d.]+)\s+(\w+)/)
      if (m) {
        subtotal = Number(m[1])
        currency = m[2]
      }
      continue
    }
    if (line.startsWith('VAT:')) {
      const m = line.match(/([\d.]+)/)
      if (m) {
        vat = Number(m[1])
      }
      continue
    }
    if (line.startsWith('TOTAL:')) {
      const m = line.match(/([\d.]+)\s+(\w+)/)
      if (m) {
        total = Number(m[1])
        currency = m[2]
      }
      continue
    }
    if (line.startsWith('Fiscal sig:')) {
      fiscalSignature = line.replace(/^Fiscal sig:\s*/i, '').trim()
      continue
    }
    if (line === 'Payments:') {
      inPayments = true
      continue
    }
    if (inPayments) {
      const tenderMatch = line.match(/^(.+?):\s*([\d.]+)\s*(\w+)(?:\s*\((.+)\))?/)
      if (tenderMatch) {
        tenders.push({
          type: tenderMatch[1].trim(),
          amount: Number(tenderMatch[2]),
          reference: tenderMatch[4]?.trim(),
        })
      }
      continue
    }
    if (line.startsWith('---')) {
      continue
    }
    const itemMatch = lines[i + 1]?.match(LINE_ITEM_RE)
    if (itemMatch && !line.match(LINE_ITEM_RE)) {
      items.push({
        product: line,
        quantity: Number(itemMatch[1]),
        unitPrice: Number(itemMatch[2]),
        lineTotal: Number(itemMatch[4]),
      })
      i += 1
    }
  }

  if (!salesOrderId) {
    return null
  }

  return {
    salesOrderId,
    createdAt,
    registerCode,
    lines: items,
    subtotal,
    vat,
    total,
    currency,
    tenders,
    fiscalSignature,
  }
}
