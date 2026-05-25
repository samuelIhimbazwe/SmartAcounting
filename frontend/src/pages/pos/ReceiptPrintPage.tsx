import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchReceiptHtmlForPrint } from '../../utils/posReceiptPrint'
import { normalizeApiError } from '../../shared/api/errors'

export function ReceiptPrintPage() {
  const { receiptId } = useParams<{ receiptId: string }>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!receiptId) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const html = await fetchReceiptHtmlForPrint(receiptId)
        if (cancelled) {
          return
        }
        document.body.innerHTML = html
        document.body.classList.add('receipt-print-page')
        window.setTimeout(() => window.print(), 300)
      } catch (err) {
        if (!cancelled) {
          setError(normalizeApiError(err).message)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [receiptId])

  if (error) {
    return (
      <main className="p-6 font-sans text-sm text-red-800">
        <h1 className="text-lg font-semibold">Could not load receipt</h1>
        <p>{error}</p>
      </main>
    )
  }

  return (
    <main className="p-6 font-sans text-sm text-neutral-600">
      Preparing receipt for print…
    </main>
  )
}
