import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlowGuide } from '../../shared/components/ui/FlowGuide'
import { posCheckoutFlowGuide, resolveFlowGuideSteps } from '../../shared/content/flowGuides'
import { useTranslation } from 'react-i18next'
import { Minus, Plus, Printer, ScanBarcode, ShoppingBag, Wallet } from 'lucide-react'
import { MomoPaymentModal } from '../../components/pos/MomoPaymentModal'
import { ReceiptDeliveryModal } from '../../components/pos/ReceiptDeliveryModal'
import { appendPosSaleHistory, primaryTenderLabel } from '../../services/posSaleHistory'
import { useAuthStore } from '../../shared/stores/authStore'
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
import { EfdStatusBadge } from '../../components/fiscal/EfdStatusBadge'
import { useEfdQueue } from '../../hooks/useEfdQueue'
import { usePermission } from '../../hooks/usePermission'
import { buildPosEfdCheckoutPayload } from '../../services/fiscal/efdCheckout'

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
  const { submitEfd } = useEfdQueue()
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
  const [momoVerified, setMomoVerified] = useState(false)
  const [airtelVerified, setAirtelVerified] = useState(false)
  const [momoModalOpen, setMomoModalOpen] = useState(false)
  const [airtelModalOpen, setAirtelModalOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const userId = useAuthStore((s) => s.userId)
  const canDiscount = usePermission('POS_DISCOUNT')
  const canReturns = usePermission('POS_RETURNS')
  const [discountAmount, setDiscountAmount] = useState('')
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

  const payableTotal = useMemo(() => {
    if (!canDiscount) {
      return total
    }
    const discount = Number(discountAmount || '0')
    return Math.max(0, Number(total) - discount).toFixed(2)
  }, [canDiscount, discountAmount, total])

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
    const rem = (Number(payableTotal) - Number(tenderSum)).toFixed(2)
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
    if (Math.abs(Number(tenderSum) - Number(payableTotal)) > 0.009) {
      setError(t('pos.tenderMismatch', { tenderSum, total: payableTotal }))
      return
    }
    if (Number(momo || '0') > 0 && !momoVerified) {
      setError('Verify MTN MoMo payment before completing the sale.')
      return
    }
    if (Number(airtel || '0') > 0 && !airtelVerified) {
      setError('Verify Airtel Money payment before completing the sale.')
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

    // Desktop offline: queue locally in SQLite (Sprint 4).
    if (typeof navigator !== 'undefined' && !navigator.onLine && isDesktop()) {
      setBusy(true)
      try {
        const { localId } = await queueOfflineSale(checkoutPayload)
        const offlineReceipt = `OFFLINE-${localId.slice(0, 8).toUpperCase()}`
        setLastSalesOrderId(localId)
        setReceipt({
          text: `Offline sale queued.\nReceipt: ${offlineReceipt}\nWill sync when connected.`,
          html: `<div><p><strong>Sale saved offline</strong></p><p>Receipt: <code>${offlineReceipt}</code></p><p>Will sync when connected.</p></div>`,
        })
        appendPosSaleHistory({
          salesOrderId: localId,
          receiptNumber: offlineReceipt,
          createdAt: new Date().toISOString(),
          customerName: customer.trim() || 'Walk-in',
          cashierId: userId,
          registerCode: register || undefined,
          itemCount: lines.length,
          totalAmount: Number(total),
          currencyCode: currency,
          primaryTender: primaryTenderLabel(tenders),
          status: 'OFFLINE_PENDING',
          tenders,
          lines: lines.map((l) => ({
            product: l.displayName,
            quantity: l.quantity,
            unitPrice: Number(l.displayUnit),
            lineTotal: Number(l.displayUnit) * l.quantity,
          })),
        })
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

    const cartSnapshot = lines.map((l) => ({
      displayName: l.displayName,
      displayUnit: l.displayUnit,
      quantity: l.quantity,
    }))
    const tendersSnapshot = [...tenders]

    setBusy(true)
    try {
      const result = await posCheckout(checkoutPayload)
      setLastSalesOrderId(result.salesOrderId)
      setReceipt({ text: result.receiptText, html: result.receiptHtml })
      let receiptNumber = result.salesOrderId
      try {
        setPrintingReceipt(true)
        const printed = await posPrintReceipt(result.salesOrderId)
        setPrintedReceipt(printed)
        receiptNumber = printed.transactionId || result.salesOrderId
      } finally {
        setPrintingReceipt(false)
      }

      const efdPayload = buildPosEfdCheckoutPayload({
        salesOrderId: result.salesOrderId,
        receiptNumber,
        cartLines: cartSnapshot,
        tenders: tendersSnapshot,
        currencyCode: currency,
        totalAmount: Number(result.totalAmount ?? total),
      })
      void submitEfd(efdPayload).catch(() => {
        /* Non-blocking: local queue + badge handle retry */
      })

      appendPosSaleHistory({
        salesOrderId: result.salesOrderId,
        receiptNumber: receiptNumber.slice(0, 8).toUpperCase(),
        createdAt: new Date().toISOString(),
        customerName: customer.trim() || 'Walk-in',
        cashierId: userId,
        registerCode: register || undefined,
        itemCount: cartSnapshot.length,
        totalAmount: Number(result.totalAmount ?? total),
        currencyCode: currency,
        primaryTender: primaryTenderLabel(tendersSnapshot),
        status: 'COMPLETED',
        tenders: tendersSnapshot,
        lines: cartSnapshot.map((l) => ({
          product: l.displayName,
          quantity: l.quantity,
          unitPrice: Number(l.displayUnit),
          lineTotal: Number(l.displayUnit) * l.quantity,
        })),
      })

      setLines([])
      setCash('')
      setMomo('')
      setAirtel('')
      setCard('')
      setMomoRef('')
      setAirtelRef('')
      setMomoVerified(false)
      setAirtelVerified(false)
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
    <div className="pos-checkout page-container--wide">
      <BrowserCompatibilityBanner />

      <FlowGuide title={posGuide.title} steps={posGuide.steps} />

      <header className="page-header page-header--split border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-8 w-8 shrink-0 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="page-title">{t('pos.title')}</h1>
            <p className="page-lead">{t('pos.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canReturns ? (
            <Link
              to="/returns"
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--color-brand-800)] no-underline hover:bg-neutral-50"
            >
              {t('nav.returns')}
            </Link>
          ) : null}
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

      <div className="pos-checkout__grid">
        <section className="surface-card">
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
              className="ui-input pos-scan-input min-w-0 flex-1 border-2 border-[var(--color-brand-300)] focus:border-[var(--color-brand-600)]"
              placeholder={t('pos.scanPlaceholder')}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={onScanKey}
              disabled={busy}
              aria-label={t('pos.scan')}
            />
            <button
              type="button"
              className="btn btn--primary shrink-0"
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

        <section className="surface-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-neutral-800">{t('pos.cart')}</span>
            <span className="text-lg font-bold tabular-nums text-[var(--color-brand-900)]">
              {payableTotal} {currency}
            </span>
          </div>
          {canDiscount ? (
            <label className="mb-3 block text-sm">
              <span className="text-neutral-600">{t('pos.discount', { defaultValue: 'Discount (RWF)' })}</span>
              <input
                className="mt-1 w-full max-w-xs rounded border border-[var(--border-subtle)] px-2 py-2"
                inputMode="decimal"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0"
              />
            </label>
          ) : null}
          <ul className="pos-cart-list space-y-2">
            {lines.map((l) => (
              <li
                key={l.key}
                className={`pos-cart-line ${l.convertError ? 'border-amber-400 bg-amber-50' : ''}`}
              >
                <div className="pos-cart-line__info min-w-0">
                  <div className="truncate font-medium">{l.displayName}</div>
                  <div className="text-xs text-neutral-500">{l.barcode}</div>
                  {l.currencyCode !== currency && (
                    <div className="text-xs text-neutral-500">
                      {t('pos.catalogNative')}: {l.unitPrice} {l.currencyCode}
                      {l.convertError && ` — ${t('pos.fxMissing')}`}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" className="pos-qty-btn" onClick={() => bumpQty(l.key, -1)} aria-label="decrease quantity">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2rem] text-center font-semibold tabular-nums">{l.quantity}</span>
                  <button type="button" className="pos-qty-btn" onClick={() => bumpQty(l.key, 1)} aria-label="increase quantity">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-medium">{decMul(l.displayUnit, l.quantity)}</div>
                  <div className="text-[10px] text-neutral-500">{currency}</div>
                </div>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost text-red-600"
                  onClick={() => removeLine(l.key)}
                  aria-label="remove line"
                >
                  ×
                </button>
              </li>
            ))}
            {!lines.length && <li className="text-center text-sm text-neutral-500">{t('pos.emptyCart')}</li>}
          </ul>
        </section>
      </div>

      <section className="pos-tenders-panel surface-card bg-[var(--color-brand-10)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-neutral-800">
          <span className="inline-flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t('pos.tenders')}
          </span>
          <Link to="/pos/history" className="text-xs font-normal text-[var(--color-brand-700)] no-underline hover:underline">
            Sale history
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="text-sm">
            <span className="text-neutral-600">{t('pos.cash')}</span>
            <input className="mt-1 w-full rounded border px-2 py-2" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="text-neutral-600">Mobile Money (MoMo)</span>
            <input
              className="mt-1 w-full rounded border px-2 py-2"
              inputMode="decimal"
              value={momo}
              onChange={(e) => {
                setMomo(e.target.value)
                setMomoVerified(false)
                setMomoRef('')
              }}
            />
            {Number(momo || '0') > 0 ? (
              <button
                type="button"
                className="mt-1 w-full rounded border border-[var(--color-brand-200)] bg-[var(--color-brand-10)] px-2 py-1.5 text-xs font-medium text-[var(--color-brand-900)]"
                onClick={() => setMomoModalOpen(true)}
              >
                {momoVerified ? `MoMo verified (${momoRef})` : 'Collect MoMo payment'}
              </button>
            ) : null}
          </label>
          <label className="text-sm">
            <span className="text-neutral-600">Airtel Money</span>
            <input
              className="mt-1 w-full rounded border px-2 py-2"
              inputMode="decimal"
              value={airtel}
              onChange={(e) => {
                setAirtel(e.target.value)
                setAirtelVerified(false)
                setAirtelRef('')
              }}
            />
            {Number(airtel || '0') > 0 ? (
              <button
                type="button"
                className="mt-1 w-full rounded border border-[var(--color-brand-200)] bg-[var(--color-brand-10)] px-2 py-1.5 text-xs font-medium text-[var(--color-brand-900)]"
                onClick={() => setAirtelModalOpen(true)}
              >
                {airtelVerified ? `Airtel verified (${airtelRef})` : 'Collect Airtel payment'}
              </button>
            ) : null}
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
        <div className="pos-pay-inline mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn--sm" onClick={fillRemainder}>
            {t('pos.fillRemainder')}
          </button>
          <span className="text-sm text-neutral-600">
            {t('pos.tenderTotal')}: <strong className="tabular-nums">{tenderSum}</strong> /{' '}
            <span className="tabular-nums">{payableTotal}</span>
          </span>
          <button type="button" className="btn btn--pay ml-auto" onClick={() => void pay()} disabled={busy}>
            {t('pos.pay')}
          </button>
        </div>
      </section>

      {lines.length > 0 && !receipt ? (
        <div className="pos-pay-sticky" role="region" aria-label={t('pos.pay')}>
          <div className="pos-pay-sticky__total">
            {t('pos.cart')}
            <strong>
              {payableTotal} {currency}
            </strong>
            <span className="pos-pay-sticky__tender">
              {t('pos.tenderTotal')}: {tenderSum}
            </span>
          </div>
          <button type="button" className="btn btn--pay" onClick={() => void pay()} disabled={busy}>
            {t('pos.pay')}
          </button>
        </div>
      ) : null}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {receipt && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-panel modal-panel--md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="mt-0 text-lg font-semibold">{t('pos.receipt')}</h2>
              <EfdStatusBadge />
            </div>
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
            <div className="mt-4 flex flex-wrap gap-2">
              {lastSalesOrderId ? (
                <button
                  type="button"
                  className="btn btn--primary w-full sm:w-auto"
                  onClick={() => setDeliveryOpen(true)}
                >
                  Send receipt (WhatsApp / SMS)
                </button>
              ) : null}
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

      <ReceiptDeliveryModal
        receiptId={deliveryOpen ? lastSalesOrderId : null}
        defaultPhone={customer.trim() ? customer : ''}
        title="Send sale receipt"
        onClose={() => setDeliveryOpen(false)}
      />

      <MomoPaymentModal
        open={momoModalOpen}
        amount={Number(momo || '0')}
        provider="MTN"
        onCancel={() => setMomoModalOpen(false)}
        onSuccess={(ref) => {
          setMomoRef(ref)
          setMomoVerified(true)
          setMomoModalOpen(false)
        }}
      />
      <MomoPaymentModal
        open={airtelModalOpen}
        amount={Number(airtel || '0')}
        provider="AIRTEL_MONEY"
        onCancel={() => setAirtelModalOpen(false)}
        onSuccess={(ref) => {
          setAirtelRef(ref)
          setAirtelVerified(true)
          setAirtelModalOpen(false)
        }}
      />
    </div>
  )
}
