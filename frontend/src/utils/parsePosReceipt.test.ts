import { describe, expect, it } from 'vitest'
import { parsePosReceiptText } from './parsePosReceipt'

const SAMPLE = `SMARTCHAIN POS
Receipt
Order: 11111111-1111-4111-8111-111111111111
Time: 2026-05-24T10:00:00Z
Register: REG-01
--------------------------------
Coffee beans
  2 x 2500.00 RWF = 5000.00
--------------------------------
Subtotal (ex VAT): 4237.29 RWF
VAT: 762.71 RWF
TOTAL: 5000.00 RWF
Payments:
  MTN MoMo: 5000.00 RWF (ABC12345)
Thank you.`

describe('parsePosReceiptText', () => {
  it('parses order id, totals, and line items', () => {
    const parsed = parsePosReceiptText(SAMPLE)
    expect(parsed).not.toBeNull()
    expect(parsed?.salesOrderId).toBe('11111111-1111-4111-8111-111111111111')
    expect(parsed?.registerCode).toBe('REG-01')
    expect(parsed?.lines).toHaveLength(1)
    expect(parsed?.lines[0].product).toBe('Coffee beans')
    expect(parsed?.total).toBe(5000)
    expect(parsed?.tenders[0].reference).toBe('ABC12345')
  })
})
