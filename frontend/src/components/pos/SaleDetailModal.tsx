import { useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { Link } from 'react-router-dom'

import { fetchPosSaleDetail, type PosSaleDetail } from '../../shared/api/posSales'

import { normalizeApiError } from '../../shared/api/errors'

import { formatRwf } from '../../utils/currency'

import { useModalFocusTrap } from '../../shared/hooks/useModalFocusTrap'

import { EfdStatusBadge } from '../fiscal/EfdStatusBadge'

import { ReceiptDeliveryModal } from './ReceiptDeliveryModal'

import { Button } from '../../shared/components/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'



function efdBadgeLabel(status: PosSaleDetail['efdStatus']): string {

  switch (status) {

    case 'submitted':

      return 'EFD submitted'

    case 'pending':

      return 'EFD pending'

    case 'failed':

      return 'EFD failed'

    default:

      return 'EFD unknown'

  }

}



function efdBadgeClass(status: PosSaleDetail['efdStatus']): string {

  switch (status) {

    case 'submitted':

      return 'bg-emerald-100 text-emerald-900'

    case 'pending':

      return 'bg-amber-100 text-amber-900'

    case 'failed':

      return 'bg-red-100 text-red-900'

    default:

      return 'bg-neutral-100 text-neutral-700'

  }

}



export function SaleDetailModal({

  salesOrderId,

  onClose,

}: {

  salesOrderId: string | null

  onClose: () => void

}) {

  const open = Boolean(salesOrderId)

  const containerRef = useModalFocusTrap({ active: open, onEscape: onClose })

  const [detail, setDetail] = useState<PosSaleDetail | null>(null)

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [deliveryOpen, setDeliveryOpen] = useState(false)



  useEffect(() => {

    if (!salesOrderId) {

      setDetail(null)

      return

    }

    setLoading(true)

    setError(null)

    void fetchPosSaleDetail(salesOrderId)

      .then(setDetail)

      .catch((err) => setError(normalizeApiError(err).message))

      .finally(() => setLoading(false))

  }, [salesOrderId])

  type SaleLineRow = NonNullable<PosSaleDetail['lines']>[number] & { rowKey: string }

  const saleLineRows = useMemo((): SaleLineRow[] => {
    if (!detail?.lines?.length) return []
    return detail.lines.map((line, i) => ({ ...line, rowKey: `${detail.salesOrderId}-${i}` }))
  }, [detail])

  const saleLineColumns = useMemo((): DataTableColumn<SaleLineRow>[] => [
    { key: 'product', header: 'Product' },
    { key: 'quantity', header: 'Qty', columnType: 'number', align: 'right' },
    {
      key: 'unitPrice',
      header: 'Unit',
      align: 'right',
      render: v => formatRwf(Number(v)),
    },
    {
      key: 'lineTotal',
      header: 'Total',
      align: 'right',
      render: v => formatRwf(Number(v)),
    },
  ], [])

  if (!open || !salesOrderId) {

    return null

  }



  const subtotal = detail?.parsedSubtotal ?? detail?.totalAmount ?? 0
  const vat = detail?.parsedVat ?? 0
  const total = detail?.totalAmount ?? subtotal + vat

  return (

    <>

      {createPortal(

        <div

          ref={containerRef}

          className="modal-overlay"

          role="dialog"

          aria-modal="true"

          aria-labelledby="sale-detail-title"

        >

          <div className="modal-panel modal-panel--lg">

            <div className="flex items-start justify-between gap-2">

              <div>

                <h2 id="sale-detail-title" className="m-0 text-lg font-semibold">

                  Receipt {detail?.receiptNumber ?? salesOrderId.slice(0, 8)}

                </h2>

                <p className="m-0 mt-1 text-sm text-neutral-600">SmartAccounting POS</p>

              </div>

              <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>

                Close

              </button>

            </div>



            {loading ? <p className="mt-4 text-sm text-neutral-500">Loading…</p> : null}

            {error ? (

              <p className="mt-4 rounded border border-red-200 bg-red-50 px-2 py-1 text-sm text-red-800">{error}</p>

            ) : null}



            {detail ? (

              <div className="mt-4 space-y-4 text-sm">

                <dl className="grid gap-1 sm:grid-cols-2">

                  <div>

                    <dt className="text-neutral-500">Date</dt>

                    <dd>{new Date(detail.createdAt).toLocaleString()}</dd>

                  </div>

                  <div>

                    <dt className="text-neutral-500">Customer</dt>

                    <dd>{detail.customerName}</dd>

                  </div>

                  <div>

                    <dt className="text-neutral-500">Register</dt>

                    <dd>{detail.registerCode ?? '—'}</dd>

                  </div>

                  <div className="flex items-center gap-2">

                    <dt className="text-neutral-500">EFD</dt>

                    <dd>

                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${efdBadgeClass(detail.efdStatus)}`}>

                        {efdBadgeLabel(detail.efdStatus)}

                      </span>

                      <EfdStatusBadge />

                    </dd>

                  </div>

                </dl>



                <DataTable
                  columns={saleLineColumns}
                  rows={saleLineRows}
                  getRowKey={row => row.rowKey}
                  showSearch={false}
                  showPagination={false}
                  emptyStateLabel="Line items not available — see receipt text below."
                  noResultsLabel="Line items not available — see receipt text below."
                />



                <div className="rounded-lg border border-[var(--border-subtle)] bg-neutral-50 p-3">

                  <div className="flex justify-between">

                    <span>Subtotal</span>

                    <span className="tabular-nums">{formatRwf(subtotal)}</span>

                  </div>

                  <div className="mt-1 flex justify-between">

                    <span>VAT (18%)</span>

                    <span className="tabular-nums">{formatRwf(vat)}</span>

                  </div>

                  <div className="mt-2 flex justify-between font-semibold">

                    <span>Total</span>

                    <span className="tabular-nums">{formatRwf(total)}</span>

                  </div>

                </div>



                <div>

                  <p className="m-0 mb-1 font-medium">Tender</p>

                  <ul className="m-0 list-inside list-disc text-neutral-700">

                    {detail.tenders.map((t, i) => (

                      <li key={`${t.tenderType}-${i}`}>

                        {t.tenderType}: {formatRwf(Number(t.amount))}

                        {t.reference ? ` (${t.reference})` : ''}

                      </li>

                    ))}

                  </ul>

                </div>



                {detail.receiptText ? (

                  <pre className="max-h-32 overflow-auto rounded border bg-neutral-50 p-2 text-xs whitespace-pre-wrap">

                    {detail.receiptText}

                  </pre>

                ) : null}



                <div className="flex flex-wrap gap-2 border-t pt-3">

                  <Button type="button" size="sm" onClick={() => setDeliveryOpen(true)}>

                    Re-send receipt

                  </Button>

                  <Link

                    to={`/returns?salesOrderId=${encodeURIComponent(salesOrderId)}`}

                    className="btn btn--sm btn--danger no-underline"

                  >

                    Process return

                  </Link>

                </div>

              </div>

            ) : null}

          </div>

        </div>,

        document.body,

      )}



      <ReceiptDeliveryModal

        receiptId={deliveryOpen ? salesOrderId : null}

        onClose={() => setDeliveryOpen(false)}

      />

    </>

  )

}


