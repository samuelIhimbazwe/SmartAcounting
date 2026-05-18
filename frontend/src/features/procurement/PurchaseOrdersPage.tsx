import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import {
  confirmPurchaseOrder,
  listPurchaseOrders,
  sendPurchaseOrder,
  type PurchaseOrder,
} from '../../shared/api/procurement'
import { normalizeApiError } from '../../shared/api/errors'

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setError(null)
    const list = await listPurchaseOrders()
    setOrders(Array.isArray(list) ? list : [])
  }

  useEffect(() => {
    load().catch((e) => setError(normalizeApiError(e).message))
  }, [])

  async function runAction(poId: string, action: 'send' | 'confirm') {
    setBusyId(poId)
    setError(null)
    try {
      if (action === 'send') {
        await sendPurchaseOrder(poId)
      } else {
        await confirmPurchaseOrder(poId)
      }
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-2">
        <ShoppingCart className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">Purchase orders</h1>
          <p className="m-0 text-sm text-neutral-600">Procurement workflow: send, confirm, GRN (Sprint 1.2).</p>
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
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                  No purchase orders yet. Demo POs appear after V41 seed on tenant 11111111-….
                </td>
              </tr>
            )}
            {orders.map((po) => (
              <tr key={po.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 font-mono text-xs">{po.poNumber}</td>
                <td className="px-3 py-2">{po.supplierName}</td>
                <td className="px-3 py-2">{po.status}</td>
                <td className="px-3 py-2">
                  {po.totalAmount?.toLocaleString()} {po.currencyCode}
                </td>
                <td className="px-3 py-2 space-x-2">
                  {po.status === 'DRAFT' && (
                    <button
                      type="button"
                      disabled={busyId === po.id}
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => void runAction(po.id, 'send')}
                    >
                      Send
                    </button>
                  )}
                  {po.status === 'SENT' && (
                    <button
                      type="button"
                      disabled={busyId === po.id}
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => void runAction(po.id, 'confirm')}
                    >
                      Confirm
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
