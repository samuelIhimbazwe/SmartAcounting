import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchPosSaleDetail, type PosSaleDetail } from '../../shared/api/posSales'
import {
  initiatePosReturn,
  listPosReturns,
  type PosReturnDto,
  type RefundMethodCode,
  type ReturnHistoryRow,
  type ReturnReasonCode,
} from '../../shared/api/posReturns'
import { normalizeApiError } from '../../shared/api/errors'
import { formatRwf } from '../../utils/currency'
import { resolvePosReceiptLookup } from '../../utils/resolvePosReceiptId'
import { RETURN_LINE_FALLBACK_PRODUCT_ID } from '../../utils/posReceiptPrint'
import { ReceiptDeliveryModal } from '../../components/pos/ReceiptDeliveryModal'
import { openPosReceiptPrint } from '../../utils/posReceiptPrint'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { formatTenderType } from '../../services/posSaleHistory'

type Step = 1 | 2 | 3 | 4
type MainTab = 'new' | 'history'

const RETURN_REASONS: { value: ReturnReasonCode; label: string }[] = [
  { value: 'DEFECTIVE', label: 'Defective' },
  { value: 'WRONG_ITEM', label: 'Wrong item' },
  { value: 'CUSTOMER_CHANGE_MIND', label: 'Customer changed mind' },
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'OTHER', label: 'Other' },
]

const REFUND_OPTIONS: { value: RefundMethodCode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MOMO', label: 'MoMo' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'CARD', label: 'Card' },
  { value: 'STORE_CREDIT', label: 'Store credit' },
  { value: 'ON_ACCOUNT', label: 'On account' },
]

interface ReturnLineRow {
  key: string
  productId: string
  sku: string
  productName: string
  originalQty: number
  alreadyReturnedQty: number
  returnQty: number
  unitPrice: number
  selected: boolean
}

function defaultRefundMethod(detail: PosSaleDetail): RefundMethodCode {
  const t = (detail.primaryTender ?? detail.tenders[0]?.tenderType ?? 'CASH').toUpperCase()
  if (t === 'MOMO' || t === 'MTN') {
    return 'MOMO'
  }
  if (t === 'AIRTEL_MONEY' || t === 'AIRTEL') {
    return 'AIRTEL_MONEY'
  }
  if (t === 'CARD') {
    return 'CARD'
  }
  if (t === 'ON_ACCOUNT') {
    return 'ON_ACCOUNT'
  }
  return 'CASH'
}

function lineRestock(reason: ReturnReasonCode): boolean {
  return reason !== 'DEFECTIVE' && reason !== 'OTHER'
}

function lineCondition(reason: ReturnReasonCode): 'RESALEABLE' | 'DAMAGED' | 'EXPIRED' {
  if (reason === 'DEFECTIVE') {
    return 'DAMAGED'
  }
  return 'RESALEABLE'
}

function buildLineRows(detail: PosSaleDetail): ReturnLineRow[] {
  const lines = detail.lines ?? []
  if (!lines.length) {
    return []
  }
  return lines.map((line, index) => ({
    key: `${detail.salesOrderId}-${index}`,
    productId: RETURN_LINE_FALLBACK_PRODUCT_ID,
    sku: line.product.slice(0, 64) || 'SKU',
    productName: line.product,
    originalQty: line.quantity,
    alreadyReturnedQty: 0,
    returnQty: line.quantity,
    unitPrice: line.unitPrice,
    selected: false,
  }))
}

export function ReturnsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('new')
  const [searchParams, setSearchParams] = useSearchParams()
  const [step, setStep] = useState<Step>(1)
  const [lookup, setLookup] = useState('')
  const [sale, setSale] = useState<PosSaleDetail | null>(null)
  const [lines, setLines] = useState<ReturnLineRow[]>([])
  const [reason, setReason] = useState<ReturnReasonCode>('CUSTOMER_CHANGE_MIND')
  const [notes, setNotes] = useState('')
  const [refundMethod, setRefundMethod] = useState<RefundMethodCode>('CASH')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<PosReturnDto | null>(null)
  const [deliveryOpen, setDeliveryOpen] = useState(false)

  const prefillId = searchParams.get('salesOrderId')

  const loadSale = useCallback(
    async (salesOrderId: string, options?: { skipToSelect?: boolean }) => {
      setBusy(true)
      setError(null)
      try {
        const detail = await fetchPosSaleDetail(salesOrderId)
        setSale(detail)
        const rows = buildLineRows(detail)
        setLines(rows)
        setRefundMethod(defaultRefundMethod(detail))
        setSearchParams({ salesOrderId }, { replace: true })
        if (options?.skipToSelect && rows.length) {
          setStep(2)
        }
      } catch (err) {
        setSale(null)
        setError(normalizeApiError(err).message)
      } finally {
        setBusy(false)
      }
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (prefillId && !sale && step === 1) {
      setLookup(prefillId)
      void loadSale(prefillId, { skipToSelect: true })
    }
  }, [prefillId, sale, step, loadSale])

  const refundTotal = useMemo(() => {
    return lines
      .filter((l) => l.selected && l.returnQty > 0)
      .reduce((sum, l) => sum + l.returnQty * l.unitPrice, 0)
  }, [lines])

  type SaleLineRow = NonNullable<PosSaleDetail['lines']>[number] & { rowKey: string }

  const saleLineRows = useMemo((): SaleLineRow[] => {
    if (!sale?.lines?.length) return []
    return sale.lines.map((line, i) => ({ ...line, rowKey: `${sale.salesOrderId}-${i}` }))
  }, [sale])

  const saleLineColumns = useMemo((): DataTableColumn<SaleLineRow>[] => [
    { key: 'product', header: 'Product' },
    { key: 'quantity', header: 'Qty', columnType: 'number', align: 'right' },
    {
      key: 'lineTotal',
      header: 'Total',
      align: 'right',
      render: v => formatRwf(Number(v)),
    },
  ], [])

  const selectedLines = lines.filter((l) => l.selected && l.returnQty > 0)

  const handleFind = async () => {
    setError(null)
    setBusy(true)
    try {
      const id = await resolvePosReceiptLookup(lookup)
      await loadSale(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setBusy(false)
    }
  }

  const resetFlow = () => {
    setStep(1)
    setLookup('')
    setSale(null)
    setLines([])
    setReason('CUSTOMER_CHANGE_MIND')
    setNotes('')
    setRefundMethod('CASH')
    setError(null)
    setCompleted(null)
    setDeliveryOpen(false)
    setSearchParams({}, { replace: true })
  }

  const goToSelect = () => {
    if (!sale) {
      return
    }
    if (!lines.length) {
      setError('No line items on this receipt — cannot process a line return.')
      return
    }
    setStep(2)
    setError(null)
  }

  const goToConfirm = () => {
    if (!selectedLines.length) {
      setError('Select at least one item to return.')
      return
    }
    if (reason === 'OTHER' && !notes.trim()) {
      setError('Notes are required when reason is Other.')
      return
    }
    setError(null)
    setStep(3)
  }

  const processReturn = async () => {
    if (!sale) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await initiatePosReturn({
        originalTransactionId: sale.salesOrderId,
        tillCode: sale.registerCode ?? 'REG-01',
        reason,
        refundMethod,
        notes: notes.trim() || undefined,
        lines: selectedLines.map((l) => ({
          productId: l.productId,
          sku: l.sku,
          productName: l.productName,
          quantity: l.returnQty,
          unitPrice: l.unitPrice,
          restock: lineRestock(reason),
          condition: lineCondition(reason),
        })),
      })
      setCompleted(result)
      setStep(4)
      setDeliveryOpen(true)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  const maxForLine = (row: ReturnLineRow) => Math.max(0, row.originalQty - row.alreadyReturnedQty)

  return (
    <div className="page-container page-container--narrow space-y-6">
      <header className="page-header">
        <div>
          <h1 className="page-title">Returns & refunds</h1>
          <p className="page-lead">Find the original sale, select items, and issue a refund.</p>
        </div>
      </header>

      <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-2">
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-sm font-medium ${mainTab === 'new' ? 'bg-[var(--color-brand-10)] text-[var(--color-brand-900)]' : 'text-neutral-600'}`}
          onClick={() => setMainTab('new')}
        >
          New return
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-sm font-medium ${mainTab === 'history' ? 'bg-[var(--color-brand-10)] text-[var(--color-brand-900)]' : 'text-neutral-600'}`}
          onClick={() => setMainTab('history')}
        >
          Return history
        </button>
      </div>

      {mainTab === 'history' ? <ReturnHistoryPanel /> : null}

      {mainTab === 'new' ? (
        <>
      <nav className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500" aria-label="Return steps">
        {(['Find sale', 'Select items', 'Confirm', 'Done'] as const).map((label, i) => {
          const n = (i + 1) as Step
          const active = step === n || (step === 4 && n === 4)
          const done = step > n
          return (
            <span
              key={label}
              className={`rounded-full px-2.5 py-1 ${active ? 'bg-[var(--color-brand-10)] text-[var(--color-brand-900)]' : done ? 'text-emerald-700' : ''}`}
            >
              {n}. {label}
            </span>
          )
        })}
      </nav>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <section className="surface-card space-y-4">
          <h2 className="m-0 text-lg font-semibold">Find original sale</h2>
          <label className="block text-sm font-medium text-neutral-700">
            Receipt number or sale ID
            <input
              className="ui-input mt-1 font-mono"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              placeholder="Receipt # or UUID"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleFind()
                }
              }}
            />
          </label>
          <Button type="button" variant="primary" onClick={() => void handleFind()} disabled={busy || !lookup.trim()}>
            {busy ? 'Searching…' : 'Find sale'}
          </Button>

          {sale ? (
            <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">Date</dt>
                  <dd>{new Date(sale.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Cashier</dt>
                  <dd className="font-mono text-xs">{sale.cashierId || '—'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Customer</dt>
                  <dd>{sale.customerName}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Payment</dt>
                  <dd>{formatTenderType(sale.primaryTender)}</dd>
                </div>
              </dl>
              <DataTable
                columns={saleLineColumns}
                rows={saleLineRows}
                getRowKey={row => row.rowKey}
                showSearch={false}
                showPagination={false}
                emptyStateLabel="No line items"
                noResultsLabel="No line items"
              />
              <p className="m-0 text-right font-semibold tabular-nums">Total: {formatRwf(sale.totalAmount)}</p>
              <Button type="button" variant="primary" onClick={goToSelect}>
                Select items to return
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 2 && sale ? (
        <section className="surface-card space-y-4">
          <h2 className="m-0 text-lg font-semibold">Select items</h2>
          <ul className="m-0 list-none space-y-2 p-0">
            {lines.map((row) => {
              const max = maxForLine(row)
              return (
                <li key={row.key} className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={row.selected}
                      onChange={(e) => {
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === row.key ? { ...l, selected: e.target.checked } : l,
                          ),
                        )
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{row.productName}</span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        Sold: {row.originalQty} × {formatRwf(row.unitPrice)}
                        {row.alreadyReturnedQty > 0
                          ? ` · Already returned: ${row.alreadyReturnedQty}`
                          : ''}
                      </span>
                    </span>
                  </label>
                  {row.selected ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                      <label className="text-xs text-neutral-600">
                        Return qty
                        <input
                          type="number"
                          min={1}
                          max={max}
                          className="ui-input mt-0.5 w-20"
                          value={row.returnQty}
                          onChange={(e) => {
                            const n = Math.min(max, Math.max(1, Number(e.target.value) || 1))
                            setLines((prev) =>
                              prev.map((l) => (l.key === row.key ? { ...l, returnQty: n } : l)),
                            )
                          }}
                        />
                      </label>
                      <span className="text-sm font-medium tabular-nums">
                        {formatRwf(row.returnQty * row.unitPrice)}
                      </span>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <p className="m-0 text-lg font-semibold tabular-nums">Refund total: {formatRwf(refundTotal)}</p>

          <label className="block text-sm font-medium">
            Return reason
            <select
              className="ui-input mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReturnReasonCode)}
            >
              {RETURN_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Notes {reason === 'OTHER' ? '(required)' : '(optional)'}
            <textarea
              className="ui-input mt-1 min-h-[4rem]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" variant="primary" onClick={goToConfirm}>
              Review return
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 && sale ? (
        <section className="surface-card space-y-4">
          <h2 className="m-0 text-lg font-semibold">Confirm return</h2>
          <ul className="m-0 list-disc pl-5 text-sm">
            {selectedLines.map((l) => (
              <li key={l.key}>
                {l.productName} × {l.returnQty} — {formatRwf(l.returnQty * l.unitPrice)}
              </li>
            ))}
          </ul>
          <p className="m-0 font-semibold tabular-nums">Refund total: {formatRwf(refundTotal)}</p>

          <label className="block text-sm font-medium">
            Refund method
            <select
              className="ui-input mt-1"
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as RefundMethodCode)}
            >
              {REFUND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-neutral-500">
              Original tender: {formatTenderType(sale.primaryTender)}. Override to cash if needed for MoMo refunds.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button type="button" variant="primary" onClick={() => void processReturn()} disabled={busy}>
              {busy ? 'Processing…' : 'Process return'}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 4 && completed ? (
        <section className="surface-card space-y-4">
          <h2 className="m-0 text-lg font-semibold text-emerald-800">Return processed</h2>
          <p className="m-0 text-sm">
            Return <strong className="font-mono">{completed.returnNumber}</strong> — status{' '}
            <strong>{completed.status}</strong>
            {completed.requiresManagerApproval ? ' (pending approval)' : ''}
          </p>
          <p className="m-0 tabular-nums font-semibold">Refund: {formatRwf(completed.totalRefundAmount)}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void openPosReceiptPrint(sale?.salesOrderId ?? completed.originalTransactionId ?? '')}>
              Print return receipt
            </Button>
            <Button type="button" variant="primary" onClick={() => setDeliveryOpen(true)}>
              Send receipt
            </Button>
            <Button type="button" variant="ghost" onClick={resetFlow}>
              Process another return
            </Button>
          </div>
        </section>
      ) : null}

      <ReceiptDeliveryModal
        receiptId={deliveryOpen ? (sale?.salesOrderId ?? completed?.originalTransactionId ?? null) : null}
        title="Send return receipt"
        onClose={() => setDeliveryOpen(false)}
      />
        </>
      ) : null}
    </div>
  )
}

function ReturnHistoryPanel() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<ReturnHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const historyColumns = useMemo((): DataTableColumn<ReturnHistoryRow>[] => [
    { key: 'returnDate', header: 'Date' },
    { key: 'customerName', header: 'Customer', render: v => String(v || 'Walk-in') },
    { key: 'products', header: 'Products', render: v => <span className="max-w-xs truncate inline-block">{String(v || '—')}</span> },
    {
      key: 'totalRefundAmount',
      header: 'Amount',
      align: 'right',
      render: v => formatRwf(Number(v)),
    },
    {
      key: 'refundMethod',
      header: 'Tender',
      render: v => formatTenderType(String(v)),
    },
    { key: 'processedBy', header: 'Processed by' },
  ], [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    void listPosReturns({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      size: 100,
    })
      .then((page) => setRows(page.content ?? []))
      .catch((err) => setError(normalizeApiError(err).message))
      .finally(() => setLoading(false))
  }, [fromDate, toDate])

  return (
    <section className="surface-card space-y-4">
      <h2 className="m-0 text-lg font-semibold">Return history</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          From date
          <input type="date" className="ui-input mt-1" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="text-sm">
          To date
          <input type="date" className="ui-input mt-1" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <DataTable
        columns={historyColumns}
        rows={rows}
        isLoading={loading}
        getRowKey={row => row.id}
        showSearch={false}
        showPagination={false}
        emptyStateLabel="No returns in this range"
        noResultsLabel="No returns in this range"
      />
    </section>
  )
}
