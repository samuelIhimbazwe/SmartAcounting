import { posPrintReceipt, posReceipt } from '../shared/api/pos'
import { printReceipt } from '../hooks/useWebPrinter'
import { desktop, isDesktop } from './platform'

/** Fallback product id when catalog id is unknown (matches mobile returns screen). */
export const RETURN_LINE_FALLBACK_PRODUCT_ID = '00000000-0000-0000-0000-000000000001'

type DesktopWithPrintReceipt = {
  printReceipt?: (receiptId: string) => Promise<void>
}

/**
 * Print a POS receipt: Electron `printReceipt` when exposed, else native ESC/POS on desktop,
 * else a print-friendly page in a new browser tab.
 */
export async function openPosReceiptPrint(receiptId: string): Promise<void> {
  const bridge = (window.smartAccountingDesktop ?? window.smartchainDesktop) as
    | (typeof desktop & DesktopWithPrintReceipt)
    | undefined

  if (bridge?.printReceipt && typeof bridge.printReceipt === 'function') {
    await bridge.printReceipt(receiptId)
    return
  }

  if (isDesktop() && desktop?.printer) {
    const printed = await posPrintReceipt(receiptId)
    if (printed.escPos) {
      await printReceipt(printed.escPos)
      return
    }
  }

  const url = `${window.location.origin}/pos/receipts/${encodeURIComponent(receiptId)}/print`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function fetchReceiptHtmlForPrint(receiptId: string): Promise<string> {
  const receipt = await posReceipt(receiptId)
  return receipt.html
}
