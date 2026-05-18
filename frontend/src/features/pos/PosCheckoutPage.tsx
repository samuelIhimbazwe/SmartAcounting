import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { FlowGuide } from '../../shared/components/ui/FlowGuide'
import { posCheckoutFlowGuide, resolveFlowGuideSteps } from '../../shared/content/flowGuides'
import { useTranslation } from 'react-i18next'
import { Minus, Plus, Printer, ScanBarcode, ShoppingBag, Wallet } from 'lucide-react'
import {
  posCheckout,
  posCreateCatalogItem,
  posPrintReceipt,
  posReprintReceipt,
  posScanBarcode,
  type PosPrintedReceiptDto,
  type PosTenderDto,
} from '../../shared/api/pos'
import { currencyConvert } from '../../shared/api/currency'
import { retailListProducts } from '../../shared/api/retail'
import { normalizeApiError } from '../../shared/api/errors'
import { queueOfflineSale } from '../../services/offlineSale'
import { supports } from '../../utils/webApis'
import { useWebBarcode } from '../../hooks/useWebBarcode'
import { useWebWakeLock } from '../../hooks/useWebWakeLock'
import { printReceipt, printViaWebBluetooth, printViaWebSerial } from '../../hooks/useWebPrinter'
import { isDesktop } from '../../utils/platform'
import { connectHidScanner } from '../../hooks/useWebHidScanner'
import { BrowserCompatibilityBanner } from './BrowserCompatibilityBanner'

type CartLine = {
  key: string
  barcode: string
  displayName: string
  /** Catalog unit price in {@link CartLine.currencyCode}. */
  unitPrice: string
  currencyCode: string
  /** Unit price converted to the session checkout currency (for totals and payment). */
  displayUnit: string
  convertError?: boolean
  quantity: number
}

function decAdd(a: string, b: string): string {
  return (Number(a) + Number(b)).toFixed(2)
}

function decMul(a: string, q: number): string {
  return (Number(a) * q).toFixed(2)
}

function printHtmlFragment(html: string) {
  const w = window.open('', '_blank', 'width=400,height=600')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title></head><body>${html}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
  w.close()
}

export function PosCheckoutPage() {
  const { t } = useTranslation()
  const posGuide = useMemo(() => resolveFlowGuideSteps(t, posCheckoutFlowGuide), [t])
  const scanId = useId()
  const currencyDatalistId = useId().replace(/:/g, '')
  const scanRef = useRef<HTMLInputElement>(null)
  const [barcode, setBarcode] = useState('')
  const [currency, setCurrency] = useState('RWF')
  const [register, setRegister] = useState('')
  const [customer, setCustomer] = useState('')
  const [lines, setLines] = useState<CartLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState<{ text: string; html: string } | null>(null)
  const [printedReceipt, setPrintedReceipt] = useState<PosPrintedReceiptDto | null>(null)
  const [printingReceipt, setPrintingReceipt] = useState(false)
  const [lastSalesOrderId, setLastSalesOrderId] = useState<string | null>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [nBc, setNBc] = useState('')
  const [nName, setNName] = useState('')
  const [nPrice, setNPrice] = useState('0')
  const [nProductId, setNProductId] = useState('')
  const [nProductOverride, setNProductOverride] = useState('')
  const [catalogProducts, setCatalogProducts] = useState<{ productId: string; name: string; sku?: string | null }[]>([])
  const [catalogProductsLoading, setCatalogProductsLoading] = useState(false)
  const [catalogProductsError, setCatalogProductsError] = useState<string | null>(null)
  const [nReorder, setNReorder] = useState('')
  const [cash, setCash] = useState('')
  const [momo, setMomo] = useState('')
  const [airtel, setAirtel] = useState('')
  const [card, setCard] = useState('')
  const [momoRef, setMomoRef] = useState('')
  const [airtelRef, setAirtelRef] = useState('')
  const [onAcct, setOnAcct] = useState('')
  const [onAcctCustomer, setOnAcctCustomer] = useState('')
  const linesRef = useRef<CartLine[]>([])
  linesRef.current = lines

  const addBarcodeToCart = useCallback(
    async (rawInput: string) => {
      const raw = rawInput.trim()
      if (!raw) {
        return
      }
      setError(null)
      setBusy(true)
      try {
        const item = await posScanBarcode(raw)
        let displayUnit = item.unitPrice
        if (item.currencyCode !== currency) {
          try {
            displayUnit = await currencyConvert(item.unitPrice, item.currencyCode, currency)
          } catch (e) {
            setError(normalizeApiError(e).message)
            return
          }
        }
        const key = `${item.barcode}-${Date.now()}`
        setLines((prev) => [
          ...prev,
          {
            key,
            barcode: item.barcode,
            displayName: item.displayName,
            unitPrice: item.unitPrice,
            currencyCode: item.currencyCode,
            displayUnit,
            quantity: 1,
          },
        ])
        setBarcode('')
      } catch (e) {
        setError(normalizeApiError(e).message)
      } finally {
        setBusy(false)
        scanRef.current?.focus()
      }
    },
    [currency],
  )

  const { videoRef, scanning, startScan, stopScan } = useWebBarcode((code) => {
    void addBarcodeToCart(code)
  })

  useWebWakeLock(lines.length > 0 || scanning)

  useEffect(() => {
    scanRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!showCatalog) return
    let cancelled = false
    setCatalogProductsLoading(true)
    setCatalogProductsError(null)
    void retailListProducts()
      .then((list) => {
        if (!cancelled) {
          setCatalogProducts(list)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogProductsError('load_failed')
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogProductsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showCatalog])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const snapshot = [...linesRef.current]
      if (!snapshot.length) return
      const next: CartLine[] = []
      for (const l of snapshot) {
        if (l.currencyCode === currency) {
          next.push({ ...l, displayUnit: l.unitPrice, convertError: false })
          continue
        }
        try {
          const du = await currencyConvert(l.unitPrice, l.currencyCode, currency)
          next.push({ ...l, displayUnit: du, convertError: false })
        } catch {
          next.push({ ...l, displayUnit: l.unitPrice, convertError: true })
        }
      }
      if (!cancelled) {
        const latest = linesRef.current
        const snapKeys = snapshot.map((l) => l.key).sort().join('\u0000')
        const curKeys = latest.map((l) => l.key).sort().join('\u0000')
        if (snapKeys === curKeys) setLines(next)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currency])

  const total = useMemo(() => {
    let sum = '0'
    for (const l of lines) {
      sum = decAdd(sum, decMul(l.displayUnit, l.quantity))
    }
    return sum
  }, [lines])

  const addFromScan = useCallback(() => void addBarcodeToCart(barcode), [addBarcodeToCart, barcode])

  const onScanKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void addFromScan()
    }
  }

  const bumpQty = (key: string, delta: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l,
      ),
    )
  }

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key))

  const tenderSum = useMemo(() => {
    const c = Number(cash || '0')
    const m = Number(momo || '0')
    const a = Number(airtel || '0')
    const k = Number(card || '0')
    const o = Number(onAcct || '0')
    return (c + m + a + k + o).toFixed(2)
  }, [cash, momo, airtel, card, onAcct])

  const fillRemainder = () => {
    const rem = (Number(total) - Number(tenderSum)).toFixed(2)
    const r = Number(rem)
    if (r <= 0) return
    if (!Number(cash || '0')) setCash(rem)
    else if (!Number(momo || '0')) setMomo(rem)
    else if (!Number(airtel || '0')) setAirtel(rem)
    else if (!Number(card || '0')) setCard(rem)
    else if (!Number(onAcct || '0')) setOnAcct(rem)
  }

  const pay = async () => {
    setError(null)
    if (!lines.length) {
      setError(t('pos.cartEmpty'))
      return
    }
    const tenders: PosTenderDto[] = []
    const push = (type: PosTenderDto['tenderType'], amountStr: string, reference?: string) => {
      const a = Number(amountStr || '0')
      if (a > 0) tenders.push({ tenderType: type, amount: a.toFixed(2), reference })
    }
    push('CASH', cash)
    push('MOMO', momo, momoRef || undefined)
    push('AIRTEL_MONEY', airtel, airtelRef || undefined)
    push('CARD', card)
    push('ON_ACCOUNT', onAcct)
    if (!tenders.length) {
      setError(t('pos.noTender'))
      return
    }
    if (Number(onAcct || '0') > 0 && !onAcctCustomer.trim()) {
      setError(t('pos.onAccountCustomerRequired'))
      return
    }
    if (lines.some((l) => l.convertError)) {
      setError(t('pos.fxRequired'))
      return
    }
    if (Math.abs(Number(tenderSum) - Number(total)) > 0.009) {
      setError(t('pos.tenderMismatch', { tenderSum, total }))
      return
    }
    const checkoutPayload = {
      customerName: customer || undefined,
      currencyCode: currency,
      posRegisterCode: register || undefined,
      lines: lines.map((l) => ({ barcode: l.barcode, quantity: String(l.quantity) })),
      tenders,
      ...(Number(onAcct || '0') > 0 ? { onAccountCustomerName: onAcctCustomer.trim() } : {}),
    }

    // Offline path: persist the sale locally and clear the cart. The
    // OfflineBanner will surface the pending count globally and drain the
    // queue automatically when connectivity returns.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setBusy(true)
      try {
        await queueOfflineSale(checkoutPayload)
        setError('Sale saved offline. Will sync when connected.')
        setLines([])
        setCash('')
        setMomo('')
        setAirtel('')
        setCard('')
        setMomoRef('')
        setAirtelRef('')
        setOnAcct('')
        setOnAcctCustomer('')
      } catch (e) {
        setError(normalizeApiError(e).message)
      } finally {
        setBusy(false)
      }
      return
    }

    setBusy(true)
    try {
      const result = await posCheckout(checkoutPayload)
      setLastSalesOrderId(result.salesOrderId)
      setReceipt({ text: result.receiptText, html: result.receiptHtml })
      try {
        setPrintingReceipt(true)
        const printed = await posPrintReceipt(result.salesOrderId)
        setPrintedReceipt(printed)
      } finally {
        setPrintingReceipt(false)
      }
      setLines([])
      setCash('')
      setMomo('')
      setAirtel('')
      setCard('')
      setMomoRef('')
      setAirtelRef('')
      setOnAcct('')
      setOnAcctCustomer('')
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  const copyEscPos = async () => {
    if (!printedReceipt?.escPos) return
    await navigator.clipboard.writeText(printedReceipt.escPos)
  }

  const downloadEscPos = () => {
    if (!printedReceipt?.escPos || !printedReceipt.transactionId) return
    const blob = new Blob([printedReceipt.escPos], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${printedReceipt.transactionId}.escpos.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const reprintEscPos = async () => {
    if (!lastSalesOrderId) return
    setError(null)
    setPrintingReceipt(true)
    try {
      const printed = await posReprintReceipt(lastSalesOrderId)
      setPrintedReceipt(printed)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setPrintingReceipt(false)
    }
  }
  const printerType = printedReceipt?.printerType ?? null
  const browserPrintDisabled = printerType === 'sms-only'
  const showHtmlPreview = !browserPrintDisabled

  const saveCatalog = async () => {
    setError(null)
    setBusy(true)
    try {
      const linkedPid = nProductOverride.trim() || nProductId.trim()
      await posCreateCatalogItem({
        barcode: nBc.trim(),
        displayName: nName.trim(),
        unitPrice: nPrice,
        currencyCode: currency,
        ...(linkedPid ? { productId: linkedPid } : {}),
        ...(nReorder.trim() ? { reorderPoint: nReorder.trim() } : {}),
      })
      setNBc('')
      setNName('')
      setNPrice('0')
      setNProductId('')
      setNProductOverride('')
      setNReorder('')
      setShowCatalog(false)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <BrowserCompatibilityBanner />

      <FlowGuide title={posGuide.title} steps={posGuide.steps} />

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">{t('pos.title')}</h1>
            <p className="m-0 text-sm text-neutral-600">{t('pos.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <label className="flex items-center gap-1">
            <span className="text-neutral-600">{t('pos.currency')}</span>
            <input
              className="w-24 rounded border border-[var(--border-subtle)] px-2 py-1 uppercase"
              list={currencyDatalistId}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.trim().toUpperCase().slice(0, 8))}
              maxLength={8}
              spellCheck={false}
            />
            <datalist id={currencyDatalistId}>
              <option value="RWF" />
              <option value="USD" />
              <option value="EUR" />
              <option value="GBP" />
              <option value="KES" />
              <option value="UGX" />
              <option value="TZS" />
            </datalist>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-neutral-600">{t('pos.register')}</span>
            <input
              className="w-28 rounded border border-[var(--border-subtle)] px-2 py-1"
              value={register}
              onChange={(e) => setRegister(e.target.value)}
              placeholder="REG-01"
            />
          </label>
        </div>
      </header>

      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-800">
            <ScanBarcode className="h-4 w-4" />
            {t('pos.scan')}
          </div>
          <video ref={videoRef} className="hidden" playsInline muted aria-hidden />
          <div className="flex gap-2">
            <input
              ref={scanRef}
              id={scanId}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border-2 border-[var(--color-brand-300)] px-3 py-3 text-lg outline-none focus:border-[var(--color-brand-600)]"
              placeholder={t('pos.scanPlaceholder')}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={onScanKey}
              disabled={busy}
              aria-label={t('pos.scan')}
            />
            <button
              type="button"
              className="rounded-lg bg-[var(--color-brand-700)] px-4 py-2 font-medium text-white hover:bg-[var(--color-brand-800)] disabled:opacity-50"
              onClick={() => void addFromScan()}
              disabled={busy}
            >
              {t('pos.add')}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              onClick={() => void startScan()}
              disabled={busy}
            >
              {scanning ? t('pos.scanWithCameraActive') : t('pos.scanWithCamera')}
            </button>
            {scanning && (
              <button
                type="button"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-900"
                onClick={() => stopScan()}
              >
                {t('pos.stopCameraScan')}
              </button>
            )}
            {!isDesktop() && (
              <button
                type="button"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                onClick={() => void connectHidScanner((c) => void addBarcodeToCart(c))}
                disabled={busy || !supports.hid}
                title={!supports.hid ? t('pos.usbScannerUnsupported') : undefined}
              >
                {t('pos.connectUsbScanner')}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-neutral-500">{t('pos.scanHint')}</p>

          <button
            type="button"
            className="mt-4 text-sm text-[var(--color-brand-800)] underline"
            onClick={() => setShowCatalog((s) => !s)}
          >
            {t('pos.toggleCatalog')}
          </button>
          {showCatalog && (
            <div className="mt-3 grid gap-2 rounded-lg bg-[var(--surface-overlay)] p-3">
              <input className="rounded border px-2 py-1" placeholder={t('pos.newBarcode')} value={nBc} onChange={(e) => setNBc(e.target.value)} />
              <input className="rounded border px-2 py-1" placeholder={t('pos.newName')} value={nName} onChange={(e) => setNName(e.target.value)} />
              <input className="rounded border px-2 py-1" placeholder={t('pos.newPrice')} value={nPrice} onChange={(e) => setNPrice(e.target.value)} />
              <label className="block text-sm text-neutral-700">
                <span className="block text-neutral-600">{t('pos.linkInventoryProduct')}</span>
                <select
                  className="mt-1 w-full rounded border border-[var(--border-subtle)] px-2 py-2 text-sm"
                  value={nProductId}
                  onChange={(e) => setNProductId(e.target.value)}
                  disabled={busy || catalogProductsLoading}
                >
                  <option value="">{t('pos.noInventoryProduct')}</option>
                  {catalogProducts.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.name}
                      {p.sku ? ` (${p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              {catalogProductsError && (
                <p className="text-xs text-amber-800" role="status">
                  {t('pos.catalogProductsError')}
                </p>
              )}
              {!catalogProducts.length && !catalogProductsLoading && !catalogProductsError && showCatalog && (
                <p className="text-xs text-neutral-500">{t('pos.catalogProductsEmpty')}</p>
              )}
              <details className="rounded border border-[var(--border-subtle)] bg-[var(--color-surface)]/50 px-2 py-1 text-xs">
                <summary className="cursor-pointer text-neutral-600">{t('pos.productIdManual')}</summary>
                <input
                  className="mt-2 w-full rounded border px-2 py-1 font-mono text-sm"
                  placeholder={t('pos.productId')}
                  value={nProductOverride}
                  onChange={(e) => setNProductOverride(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </details>
              <input
                className="rounded border px-2 py-1"
                placeholder={t('pos.reorderPoint')}
                inputMode="decimal"
                value={nReorder}
                onChange={(e) => setNReorder(e.target.value)}
              />
              <button type="button" className="rounded bg-neutral-800 py-2 text-sm text-white" onClick={() => void saveCatalog()} disabled={busy}>
                {t('pos.saveItem')}
              </button>
            </div>
          )}

          <label className="mt-4 block text-sm">
            <span className="text-neutral-600">{t('pos.customer')}</span>
            <input
              className="mt-1 w-full rounded border border-[var(--border-subtle)] px-2 py-2"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder={t('pos.walkIn')}
            />
          </label>
        </section>

        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-800">{t('pos.cart')}</span>
            <span className="text-lg font-bold text-[var(--color-brand-900)]">
              {total} {currency}
            </span>
          </div>
          <ul className="max-h-64 space-y-2 overflow-auto">
            {lines.map((l) => (
              <li
                key={l.key}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-2 text-sm ${
                  l.convertError ? 'border-amber-400 bg-amber-50' : 'border-[var(--border-subtle)]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{l.displayName}</div>
                  <div className="text-xs text-neutral-500">{l.barcode}</div>
                  {l.currencyCode !== currency && (
                    <div className="text-xs text-neutral-500">
                      {t('pos.catalogNative')}: {l.unitPrice} {l.currencyCode}
                      {l.convertError && ` â€” ${t('pos.fxMissing')}`}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" className="rounded border p-1" onClick={() => bumpQty(l.key, -1)} aria-label="dec">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center">{l.quantity}</span>
                  <button type="button" className="rounded border p-1" onClick={() => bumpQty(l.key, 1)} aria-label="inc">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="w-28 text-right">
                  <div>{decMul(l.displayUnit, l.quantity)}</div>
                  <div className="text-[10px] font-normal text-neutral-500">{currency}</div>
                </div>
                <button type="button" className="text-red-600" onClick={() => removeLine(l.key)}>
                  Ã—
                </button>
              </li>
            ))}
            {!lines.length && <li className="text-center text-sm text-neutral-500">{t('pos.emptyCart')}</li>}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-brand-10)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-800">
          <Wallet className="h-4 w-4" />
          {t('pos.tenders')}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="text-sm">
            <span className="text-neutral-600">{t('pos.cash')}</span>
            <input className="mt-1 w-full rounded border px-2 py-2" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="text-neutral-600">{t('pos.momo')}</span>
            <input className="mt-1 w-full rounded border px-2 py-2" inputMode="decimal" value={momo} onChange={(e) => setMomo(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="text-neutral-600">{t('pos.airtel')}</span>
            <input className="mt-1 w-full rounded border px-2 py-2" inputMode="decimal" value={airtel} onChange={(e) => setAirtel(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="text-neutral-600">{t('pos.card')}</span>
            <input className="mt-1 w-full rounded border px-2 py-2" inputMode="decimal" value={card} onChange={(e) => setCard(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="text-neutral-600">{t('pos.onAccount')}</span>
            <input className="mt-1 w-full rounded border px-2 py-2" inputMode="decimal" value={onAcct} onChange={(e) => setOnAcct(e.target.value)} />
          </label>
        </div>
        <label className="mt-2 block max-w-xl text-sm">
          <span className="text-neutral-600">{t('pos.onAccountCustomer')}</span>
          <input
            className="mt-1 w-full rounded border px-2 py-2"
            value={onAcctCustomer}
            onChange={(e) => setOnAcctCustomer(e.target.value)}
            placeholder={t('pos.walkIn')}
          />
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-neutral-600">{t('pos.momoRef')}</span>
            <input className="mt-1 w-full rounded border px-2 py-2" value={momoRef} onChange={(e) => setMomoRef(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-600">{t('pos.airtelRef')}</span>
            <input className="mt-1 w-full rounded border px-2 py-2" value={airtelRef} onChange={(e) => setAirtelRef(e.target.value)} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-sm" onClick={fillRemainder}>
            {t('pos.fillRemainder')}
          </button>
          <span className="text-sm text-neutral-600">
            {t('pos.tenderTotal')}: <strong>{tenderSum}</strong> / {total}
          </span>
          <button
            type="button"
            className="ml-auto rounded-lg bg-emerald-700 px-6 py-3 text-lg font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            onClick={() => void pay()}
            disabled={busy}
          >
            {t('pos.pay')}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-[var(--color-surface)] p-4 shadow-xl">
            <h2 className="mt-0 text-lg font-semibold">{t('pos.receipt')}</h2>
            {showHtmlPreview ? (
              <div className="receipt-print border border-dashed border-neutral-300 p-2" dangerouslySetInnerHTML={{ __html: receipt.html }} />
            ) : (
              <div className="rounded border border-[var(--border-subtle)] bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                {t('pos.smsOnlyReceiptNotice')}
              </div>
            )}
            <div className="mt-3 rounded border border-[var(--border-subtle)] bg-neutral-50 p-2">
              <div className="mb-1 text-xs text-neutral-600">
                {t('pos.escpos')}
                {printedReceipt ? ` (${printedReceipt.printerType})` : ''}
              </div>
              {printedReceipt && <div className="mb-2 text-xs text-neutral-500">{t('pos.printerTypeHint', { type: printedReceipt.printerType })}</div>}
              {printingReceipt && <div className="text-xs text-neutral-500">{t('pos.generatingReceipt')}</div>}
              {!printingReceipt && printedReceipt && (
                <>
                  <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-4">
                    {printedReceipt.escPos}
                  </pre>
                  <div className="mt-2 text-xs text-neutral-600">
                    {t('pos.smsReceiptsSent')}: {printedReceipt.smsReceiptsSent}
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2 text-white"
                onClick={() => printHtmlFragment(receipt.html)}
                disabled={browserPrintDisabled}
                title={browserPrintDisabled ? t('pos.browserPrintDisabled') : undefined}
              >
                <Printer className="h-4 w-4" />
                {t('pos.print')}
              </button>
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => void reprintEscPos()}
                disabled={printingReceipt || !lastSalesOrderId}
              >
                {t('pos.reprint')}
              </button>
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => void copyEscPos()}
                disabled={!printedReceipt}
              >
                {t('pos.copyEscpos')}
              </button>
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={downloadEscPos} disabled={!printedReceipt}>
                {t('pos.downloadEscpos')}
              </button>
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                disabled={!printedReceipt?.escPos}
                onClick={() => {
                  const payload = printedReceipt?.escPos
                  if (payload) {
                    void printReceipt(payload)
                  }
                }}
                title={isDesktop() ? t('pos.printNativeHint') : t('pos.printReceiptHint')}
              >
                {t('pos.printReceipt')}
              </button>
              {!isDesktop() && (
                <>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2 text-sm"
                    disabled={!printedReceipt?.escPos}
                    onClick={() => {
                      const payload = printedReceipt?.escPos
                      if (payload) {
                        void printViaWebBluetooth(payload)
                      }
                    }}
                    title={t('pos.printBluetoothHint')}
                  >
                    {t('pos.printBluetooth')}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2 text-sm"
                    disabled={!printedReceipt?.escPos}
                    onClick={() => {
                      const payload = printedReceipt?.escPos
                      if (payload) {
                        void printViaWebSerial(payload)
                      }
                    }}
                    title={t('pos.printSerialHint')}
                  >
                    {t('pos.printSerial')}
                  </button>
                </>
              )}
              <button type="button" className="rounded-lg border px-4 py-2" onClick={() => setReceipt(null)}>
                {t('pos.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
