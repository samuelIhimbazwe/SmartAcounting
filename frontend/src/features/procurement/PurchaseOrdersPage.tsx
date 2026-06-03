import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShoppingCart, X } from 'lucide-react'
import {
  confirmPurchaseOrder,
  createGrn,
  getPurchaseOrder,
  listGrnLines,
  listPoGrns,
  listPurchaseOrders,
  sendPurchaseOrder,
  type GrnLineRow,
  type GrnSummary,
  type PurchaseOrder,
  type PurchaseOrderDetailResponse,
} from '../../shared/api/procurement'
import { normalizeApiError } from '../../shared/api/errors'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { FormField, FormStack } from '../../components/ui'

type PurchaseOrderLine = PurchaseOrderDetailResponse['lines'][number]
type GrnQtyRow = PurchaseOrderLine & { qtyReceived: string }

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PurchaseOrderDetailResponse | null>(null)
  const [detailTab, setDetailTab] = useState<'lines' | 'grn'>('lines')
  const [grns, setGrns] = useState<GrnSummary[]>([])
  const [grnLines, setGrnLines] = useState<Record<string, GrnLineRow[]>>({})
  const [grnModalOpen, setGrnModalOpen] = useState(false)
  const [grnDate, setGrnDate] = useState(new Date().toISOString().slice(0, 10))
  const [grnNotes, setGrnNotes] = useState('')
  const [grnQty, setGrnQty] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setError(null)
    const list = await listPurchaseOrders()
    setOrders(Array.isArray(list) ? list : [])
  }, [])

  useEffect(() => {
    load().catch((e) => setError(normalizeApiError(e).message))
  }, [load])

  const openDetail = async (poId: string) => {
    setSelectedId(poId)
    setDetailTab('lines')
    setError(null)
    try {
      const [poDetail, poGrns] = await Promise.all([getPurchaseOrder(poId), listPoGrns(poId)])
      setDetail(poDetail)
      setGrns(poGrns)
      const lineMap: Record<string, GrnLineRow[]> = {}
      for (const grn of poGrns) {
        lineMap[grn.id] = await listGrnLines(grn.id)
      }
      setGrnLines(lineMap)
      const qty: Record<string, string> = {}
      for (const line of poDetail.lines) {
        const remaining = Math.max(0, Number(line.orderedQuantity) - Number(line.receivedQuantity))
        qty[line.id] = String(remaining)
      }
      setGrnQty(qty)
    } catch (e) {
      setError(normalizeApiError(e).message)
    }
  }

  async function runAction(poId: string, action: 'send' | 'confirm') {
    setBusyId(poId)
    setError(null)
    try {
      if (action === 'send') await sendPurchaseOrder(poId)
      else await confirmPurchaseOrder(poId)
      await load()
      if (selectedId === poId) await openDetail(poId)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  const submitGrn = async () => {
    if (!detail || !selectedId) return
    setBusyId(selectedId)
    setError(null)
    try {
      await createGrn(selectedId, {
        notes: grnNotes.trim() || undefined,
        receivedDate: grnDate,
        lines: detail.lines
          .map((line) => ({
            poLineId: line.id,
            productId: line.productId,
            sku: line.sku,
            productName: line.productName,
            expectedQuantity: Number(line.orderedQuantity),
            receivedQuantity: Number(grnQty[line.id] ?? 0),
            unitCost: Number(line.unitCost),
          }))
          .filter((l) => l.receivedQuantity > 0),
      })
      setGrnModalOpen(false)
      await load()
      await openDetail(selectedId)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  const canCreateGrn = detail?.purchaseOrder.status === 'CONFIRMED' || detail?.purchaseOrder.status === 'PARTIALLY_RECEIVED'

  const orderColumns = useMemo((): DataTableColumn<PurchaseOrder>[] => [
    {
      key: 'poNumber',
      header: 'PO #',
      render: v => <span className="font-mono text-xs">{String(v)}</span>,
    },
    { key: 'supplierName', header: 'Supplier' },
    { key: 'status', header: 'Status', columnType: 'status' },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (_v, po) => `${po.totalAmount?.toLocaleString()} ${po.currencyCode}`,
    },
  ], [])

  const poLineColumns = useMemo((): DataTableColumn<PurchaseOrderLine>[] => [
    { key: 'productName', header: 'Product' },
    { key: 'orderedQuantity', header: 'Ordered', columnType: 'number', align: 'right' },
    { key: 'receivedQuantity', header: 'Received', columnType: 'number', align: 'right' },
    { key: 'status', header: 'Status', columnType: 'status' },
  ], [])

  const grnLineColumns = useMemo((): DataTableColumn<GrnLineRow>[] => [
    { key: 'sku', header: 'SKU' },
    { key: 'productName', header: 'Product' },
    { key: 'receivedQuantity', header: 'Received', columnType: 'number', align: 'right' },
  ], [])

  const grnFormRows = useMemo((): GrnQtyRow[] => {
    if (!detail) return []
    return detail.lines.map(line => ({ ...line, qtyReceived: grnQty[line.id] ?? '' }))
  }, [detail, grnQty])

  const grnFormColumns = useMemo((): DataTableColumn<GrnQtyRow>[] => [
    { key: 'productName', header: 'Line', sortable: false },
    {
      key: 'qtyReceived',
      header: 'Qty received',
      align: 'right',
      sortable: false,
      render: (_v, line) => (
        <input
          type="number"
          min="0"
          step="0.01"
          className="w-24 rounded border px-2 py-1 text-right"
          value={grnQty[line.id] ?? ''}
          onChange={e => setGrnQty(prev => ({ ...prev, [line.id]: e.target.value }))}
        />
      ),
    },
  ], [grnQty])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-2">
        <ShoppingCart className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">Purchase orders</h1>
          <p className="m-0 text-sm text-neutral-600">Send, confirm, and receive goods (GRN).</p>
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <DataTable
        columns={orderColumns}
        rows={orders}
        getRowKey={row => row.id}
        onRowClick={po => void openDetail(po.id)}
        rowActions={[
          {
            label: 'Send',
            onClick: po => void runAction(po.id, 'send'),
            disabled: po => po.status !== 'DRAFT' || busyId === po.id,
          },
          {
            label: 'Confirm',
            onClick: po => void runAction(po.id, 'confirm'),
            disabled: po => po.status !== 'SENT' || busyId === po.id,
          },
        ]}
        showSearch={false}
        emptyStateLabel="No purchase orders yet"
        noResultsLabel="No purchase orders match your search"
      />

      {detail && selectedId ? (
        <section className="rounded-xl border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold m-0">{detail.purchaseOrder.poNumber} — {detail.purchaseOrder.supplierName}</h2>
            <button type="button" onClick={() => { setSelectedId(null); setDetail(null) }} aria-label="Close"><X className="h-5 w-5 text-slate-500" /></button>
          </div>
          <div className="flex gap-2">
            <button type="button" className={`rounded px-3 py-1 text-sm ${detailTab === 'lines' ? 'bg-indigo-100 text-indigo-800' : 'border'}`} onClick={() => setDetailTab('lines')}>Lines</button>
            <button type="button" className={`rounded px-3 py-1 text-sm ${detailTab === 'grn' ? 'bg-indigo-100 text-indigo-800' : 'border'}`} onClick={() => setDetailTab('grn')}>GRN</button>
          </div>

          {detailTab === 'lines' ? (
            <DataTable
              columns={poLineColumns}
              rows={detail.lines}
              getRowKey={row => row.id}
              showSearch={false}
              showPagination={false}
              emptyStateLabel="No lines on this PO"
              noResultsLabel="No lines on this PO"
            />
          ) : (
            <div className="space-y-3">
              {canCreateGrn ? (
                <button type="button" className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white" onClick={() => setGrnModalOpen(true)}>Create GRN</button>
              ) : null}
              {grns.length === 0 ? <p className="text-sm text-slate-500">No GRNs recorded yet.</p> : null}
              {grns.map((grn) => (
                <div key={grn.id} className="rounded border p-3 space-y-2">
                  <p className="m-0 text-sm font-medium">{grn.grnNumber} · {grn.receivedDate} · {grn.status}</p>
                  {grn.notes ? <p className="m-0 text-xs text-slate-600">{grn.notes}</p> : null}
                  <DataTable
                    columns={grnLineColumns}
                    rows={grnLines[grn.id] ?? []}
                    getRowKey={row => row.id}
                    showSearch={false}
                    showPagination={false}
                    compact
                    emptyStateLabel="No GRN lines"
                    noResultsLabel="No GRN lines"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {grnModalOpen && detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 space-y-3 shadow-xl">
            <h3 className="text-lg font-semibold m-0">Create GRN</h3>
            <FormStack>
              <FormField label="Received date">
                <input type="date" className="w-full rounded border px-2 py-1.5" value={grnDate} onChange={(e) => setGrnDate(e.target.value)} />
              </FormField>
              <FormField label="Notes">
                <textarea className="w-full rounded border px-2 py-1.5 min-h-[3rem]" value={grnNotes} onChange={(e) => setGrnNotes(e.target.value)} />
              </FormField>
            </FormStack>
            <DataTable
              columns={grnFormColumns}
              rows={grnFormRows}
              getRowKey={row => row.id}
              showSearch={false}
              showPagination={false}
              emptyStateLabel="No PO lines"
              noResultsLabel="No PO lines"
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setGrnModalOpen(false)}>Cancel</button>
              <button type="button" disabled={busyId === selectedId} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50" onClick={() => void submitGrn()}>Save GRN</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
