import { useCallback, useEffect, useState } from 'react'
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

      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2">PO #</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-500">No purchase orders yet.</td></tr>
            )}
            {orders.map((po) => (
              <tr key={po.id} className={`border-t border-[var(--border-subtle)] ${selectedId === po.id ? 'bg-indigo-50' : ''}`}>
                <td className="px-3 py-2">
                  <button type="button" className="font-mono text-xs text-indigo-700 hover:underline" onClick={() => void openDetail(po.id)}>{po.poNumber}</button>
                </td>
                <td className="px-3 py-2">{po.supplierName}</td>
                <td className="px-3 py-2">{po.status}</td>
                <td className="px-3 py-2">{po.totalAmount?.toLocaleString()} {po.currencyCode}</td>
                <td className="px-3 py-2 space-x-2">
                  {po.status === 'DRAFT' && (
                    <button type="button" disabled={busyId === po.id} className="rounded border px-2 py-1 text-xs" onClick={() => void runAction(po.id, 'send')}>Send</button>
                  )}
                  {po.status === 'SENT' && (
                    <button type="button" disabled={busyId === po.id} className="rounded border px-2 py-1 text-xs" onClick={() => void runAction(po.id, 'confirm')}>Confirm</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-left text-slate-600"><th className="py-2">Product</th><th className="py-2 text-right">Ordered</th><th className="py-2 text-right">Received</th><th className="py-2">Status</th></tr></thead>
              <tbody>
                {detail.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="py-2">{line.productName}</td>
                    <td className="py-2 text-right">{line.orderedQuantity}</td>
                    <td className="py-2 text-right">{line.receivedQuantity}</td>
                    <td className="py-2">{line.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <table className="min-w-full text-xs">
                    <thead><tr className="text-left text-slate-500"><th className="py-1">SKU</th><th className="py-1">Product</th><th className="py-1 text-right">Received</th></tr></thead>
                    <tbody>
                      {(grnLines[grn.id] ?? []).map((line) => (
                        <tr key={line.id} className="border-t"><td className="py-1">{line.sku}</td><td className="py-1">{line.productName}</td><td className="py-1 text-right">{line.receivedQuantity}</td></tr>
                      ))}
                    </tbody>
                  </table>
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
            <label className="block text-sm">Received date<input type="date" className="mt-1 w-full rounded border px-2 py-1.5" value={grnDate} onChange={(e) => setGrnDate(e.target.value)} /></label>
            <label className="block text-sm">Notes<textarea className="mt-1 w-full rounded border px-2 py-1.5 min-h-[3rem]" value={grnNotes} onChange={(e) => setGrnNotes(e.target.value)} /></label>
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-left"><th className="py-1">Line</th><th className="py-1 text-right">Qty received</th></tr></thead>
              <tbody>
                {detail.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="py-2">{line.productName}</td>
                    <td className="py-2 text-right">
                      <input type="number" min="0" step="0.01" className="w-24 rounded border px-2 py-1 text-right" value={grnQty[line.id] ?? ''} onChange={(e) => setGrnQty((prev) => ({ ...prev, [line.id]: e.target.value }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
