import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, RefreshCw } from 'lucide-react'
import { FlowGuide } from '../../shared/components/ui/FlowGuide'
import { resolveFlowGuideSteps, retailReceiveFlowGuide } from '../../shared/content/flowGuides'
import {
  inventoryBatches,
  inventoryBalances,
  inventoryReceive,
  retailCreateProduct,
  retailListProducts,
  retailTillClose,
  retailTillExpected,
} from '../../shared/api/retail'
import { normalizeApiError } from '../../shared/api/errors'

const DEFAULT_LOC = 'SHOP'

export function RetailOpsPage() {
  const { t } = useTranslation()
  const receiveGuide = useMemo(() => resolveFlowGuideSteps(t, retailReceiveFlowGuide), [t])

  const [products, setProducts] = useState<{ productId: string; name: string; sku?: string | null; unit?: string | null }[]>(
    [],
  )
  const [balances, setBalances] = useState<
    { productId: string; locationCode: string; quantity: string; productName?: string }[]
  >([])
  const [batches, setBatches] = useState<
    { batchId: string; productId: string; lotCode?: string; expiryDate?: string; quantityOnHand: string; productName?: string }[]
  >([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [pName, setPName] = useState('')
  const [pSku, setPSku] = useState('')
  const [pUnit, setPUnit] = useState('')

  const [recvProductId, setRecvProductId] = useState('')
  const [recvQty, setRecvQty] = useState('1')
  const [recvLoc, setRecvLoc] = useState(DEFAULT_LOC)
  const [recvRef, setRecvRef] = useState('GRN')
  const [recvLotCode, setRecvLotCode] = useState('')
  const [recvExpiryDate, setRecvExpiryDate] = useState('')
  const [recvCost, setRecvCost] = useState('1')
  const [allowExpired, setAllowExpired] = useState(false)

  const [tillDate, setTillDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tillReg, setTillReg] = useState('')
  const [expCash, setExpCash] = useState('')
  const [expMomo, setExpMomo] = useState('')
  const [expAirtel, setExpAirtel] = useState('')
  const [expCard, setExpCard] = useState('')
  const [expOA, setExpOA] = useState('')
  const [cCash, setCCash] = useState('')
  const [cMomo, setCMomo] = useState('')
  const [cAirtel, setCAirtel] = useState('')
  const [cCard, setCCard] = useState('')
  const [cOA, setCOA] = useState('')
  const [tillNotes, setTillNotes] = useState('')
  const [tillResult, setTillResult] = useState<Record<string, unknown> | null>(null)

  const refreshAll = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const [prods, bal, bts] = await Promise.all([
        retailListProducts(),
        inventoryBalances(DEFAULT_LOC),
        inventoryBatches(DEFAULT_LOC),
      ])
      setProducts(prods)
      setBalances(bal)
      setBatches(bts)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const saveProduct = async () => {
    setError(null)
    setBusy(true)
    try {
      await retailCreateProduct({
        name: pName.trim(),
        sku: pSku.trim() || undefined,
        unit: pUnit.trim() || undefined,
      })
      setPName('')
      setPSku('')
      setPUnit('')
      await refreshAll()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  const receive = async () => {
    setError(null)
    setBusy(true)
    try {
      await inventoryReceive({
        productId: recvProductId.trim(),
        location: recvLoc.trim() || DEFAULT_LOC,
        quantity: recvQty,
        costPrice: recvCost.trim() || '1',
        supplierRef: recvRef.trim() || 'POS',
        lotCode: recvLotCode.trim() || undefined,
        expiryDate: recvExpiryDate || undefined,
        allowExpiredReceipt: allowExpired || undefined,
      })
      setRecvLotCode('')
      setRecvExpiryDate('')
      await refreshAll()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  const loadTillExpected = async () => {
    setError(null)
    if (!tillReg.trim()) {
      setError(t('retail.tillRegRequired'))
      return
    }
    setBusy(true)
    try {
      const ex = await retailTillExpected(tillDate, tillReg.trim())
      setExpCash(String(ex.cash ?? ''))
      setExpMomo(String(ex.momo ?? ''))
      setExpAirtel(String(ex.airtelMoney ?? ''))
      setExpCard(String(ex.card ?? ''))
      setExpOA(String(ex.onAccount ?? ''))
      setCCash(String(ex.cash ?? ''))
      setCMomo(String(ex.momo ?? ''))
      setCAirtel(String(ex.airtelMoney ?? ''))
      setCCard(String(ex.card ?? ''))
      setCOA(String(ex.onAccount ?? ''))
      setTillResult(null)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  const submitTill = async () => {
    setError(null)
    if (!tillReg.trim()) {
      setError(t('retail.tillRegRequired'))
      return
    }
    setBusy(true)
    try {
      const out = await retailTillClose({
        businessDate: tillDate,
        posRegisterCode: tillReg.trim(),
        countedCash: cCash || '0',
        countedMomo: cMomo || '0',
        countedAirtel: cAirtel || '0',
        countedCard: cCard || '0',
        countedOnAccount: cOA || '0',
        notes: tillNotes.trim() || undefined,
      })
      setTillResult(out)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">{t('retail.title')}</h1>
            <p className="m-0 text-sm text-neutral-600">{t('retail.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          onClick={() => void refreshAll()}
          disabled={busy}
        >
          <RefreshCw className="h-4 w-4" />
          {t('retail.refresh')}
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <FlowGuide title={receiveGuide.title} steps={receiveGuide.steps} />

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-semibold">{t('retail.products')}</h2>
        <p className="text-sm text-neutral-600">{t('retail.productsHint')}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input className="rounded border px-2 py-2" placeholder={t('retail.productName')} value={pName} onChange={(e) => setPName(e.target.value)} />
          <input className="rounded border px-2 py-2" placeholder={t('retail.sku')} value={pSku} onChange={(e) => setPSku(e.target.value)} />
          <input className="rounded border px-2 py-2" placeholder={t('retail.unit')} value={pUnit} onChange={(e) => setPUnit(e.target.value)} />
        </div>
        <button
          type="button"
          className="mt-3 rounded-lg bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void saveProduct()}
          disabled={busy || !pName.trim()}
        >
          {t('retail.createProduct')}
        </button>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="py-2 pr-2">{t('retail.productName')}</th>
                <th className="py-2 pr-2">SKU</th>
                <th className="py-2">Unit</th>
                <th className="py-2 font-mono">productId</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.productId} className="border-b border-neutral-100">
                  <td className="py-2 pr-2">{p.name}</td>
                  <td className="py-2 pr-2">{p.sku ?? 'â€”'}</td>
                  <td className="py-2">{p.unit ?? 'â€”'}</td>
                  <td className="py-2 font-mono text-xs">{p.productId}</td>
                </tr>
              ))}
              {!products.length && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-neutral-500">
                    {t('retail.noProducts')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-semibold">{t('retail.stockTitle')}</h2>
        <p className="text-sm text-neutral-600">{t('retail.stockHint', { loc: DEFAULT_LOC })}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-6">
          <input
            className="rounded border px-2 py-2 font-mono text-sm sm:col-span-3"
            placeholder={t('retail.recvProductId')}
            value={recvProductId}
            onChange={(e) => setRecvProductId(e.target.value)}
          />
          <input className="rounded border px-2 py-2" placeholder={t('retail.recvQty')} value={recvQty} onChange={(e) => setRecvQty(e.target.value)} />
          <input className="rounded border px-2 py-2" placeholder={t('retail.recvLoc')} value={recvLoc} onChange={(e) => setRecvLoc(e.target.value)} />
          <input className="rounded border px-2 py-2" placeholder={t('retail.recvLot')} value={recvLotCode} onChange={(e) => setRecvLotCode(e.target.value)} />
          <input type="date" className="rounded border px-2 py-2" value={recvExpiryDate} onChange={(e) => setRecvExpiryDate(e.target.value)} />
          <input
            className="rounded border px-2 py-2"
            placeholder={t('retail.recvCost')}
            value={recvCost}
            onChange={(e) => setRecvCost(e.target.value)}
          />
          <input className="rounded border px-2 py-2 sm:col-span-3" placeholder={t('retail.recvRef')} value={recvRef} onChange={(e) => setRecvRef(e.target.value)} />
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allowExpired} onChange={(e) => setAllowExpired(e.target.checked)} />
          {t('retail.allowExpired')}
        </label>
        <button
          type="button"
          className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void receive()}
          disabled={busy || !recvProductId.trim()}
        >
          {t('retail.receive')}
        </button>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="py-2">{t('retail.product')}</th>
                <th className="py-2">{t('retail.qty')}</th>
                <th className="py-2 font-mono">productId</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={`${b.productId}-${b.locationCode}`} className="border-b border-neutral-100">
                  <td className="py-2">{b.productName ?? 'â€”'}</td>
                  <td className="py-2">{b.quantity}</td>
                  <td className="py-2 font-mono text-xs">{b.productId}</td>
                </tr>
              ))}
              {!balances.length && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-neutral-500">
                    {t('retail.noStock')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="py-2">{t('retail.product')}</th>
                <th className="py-2">{t('retail.recvLot')}</th>
                <th className="py-2">{t('retail.expiryDate')}</th>
                <th className="py-2">{t('retail.qty')}</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batchId} className="border-b border-neutral-100">
                  <td className="py-2">{b.productName ?? 'â€”'}</td>
                  <td className="py-2">{b.lotCode ?? 'â€”'}</td>
                  <td className="py-2">{b.expiryDate ?? 'â€”'}</td>
                  <td className="py-2">{b.quantityOnHand}</td>
                </tr>
              ))}
              {!batches.length && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-neutral-500">
                    {t('retail.noBatches')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-semibold">{t('retail.tillTitle')}</h2>
        <p className="text-sm text-neutral-600">{t('retail.tillHint')}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="text-sm">
            {t('retail.tillDate')}
            <input type="date" className="mt-1 block rounded border px-2 py-2" value={tillDate} onChange={(e) => setTillDate(e.target.value)} />
          </label>
          <label className="text-sm">
            {t('retail.tillRegister')}
            <input className="mt-1 block rounded border px-2 py-2" value={tillReg} onChange={(e) => setTillReg(e.target.value)} placeholder="REG-01" />
          </label>
          <button type="button" className="self-end rounded-lg border px-4 py-2 text-sm" onClick={() => void loadTillExpected()} disabled={busy}>
            {t('retail.loadExpected')}
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          <div className="text-xs font-medium text-neutral-500">{t('pos.cash')}</div>
          <div className="text-xs font-medium text-neutral-500">{t('pos.momo')}</div>
          <div className="text-xs font-medium text-neutral-500">{t('pos.airtel')}</div>
          <div className="text-xs font-medium text-neutral-500">{t('pos.card')}</div>
          <div className="text-xs font-medium text-neutral-500">{t('retail.onAccount')}</div>
          <input className="rounded border px-2 py-1 text-sm" readOnly value={expCash} />
          <input className="rounded border px-2 py-1 text-sm" readOnly value={expMomo} />
          <input className="rounded border px-2 py-1 text-sm" readOnly value={expAirtel} />
          <input className="rounded border px-2 py-1 text-sm" readOnly value={expCard} />
          <input className="rounded border px-2 py-1 text-sm" readOnly value={expOA} />
          <input className="rounded border px-2 py-1 text-sm" value={cCash} onChange={(e) => setCCash(e.target.value)} />
          <input className="rounded border px-2 py-1 text-sm" value={cMomo} onChange={(e) => setCMomo(e.target.value)} />
          <input className="rounded border px-2 py-1 text-sm" value={cAirtel} onChange={(e) => setCAirtel(e.target.value)} />
          <input className="rounded border px-2 py-1 text-sm" value={cCard} onChange={(e) => setCCard(e.target.value)} />
          <input className="rounded border px-2 py-1 text-sm" value={cOA} onChange={(e) => setCOA(e.target.value)} />
        </div>
        <label className="mt-3 block text-sm">
          {t('retail.notes')}
          <input className="mt-1 w-full rounded border px-2 py-2" value={tillNotes} onChange={(e) => setTillNotes(e.target.value)} />
        </label>
        <button
          type="button"
          className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void submitTill()}
          disabled={busy}
        >
          {t('retail.closeTill')}
        </button>
        {tillResult && (
          <pre className="mt-4 max-h-64 overflow-auto rounded bg-neutral-50 p-3 text-xs">{JSON.stringify(tillResult, null, 2)}</pre>
        )}
      </section>
    </div>
  )
}
