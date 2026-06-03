import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Banknote,
  CreditCard,
  FileText,
  Landmark,
  MessageCircle,
  Search,
  ShoppingBag,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react'
import { Badge, Button } from '../../components/ui'
import { MomoPaymentModal } from '../../components/pos/MomoPaymentModal'
import { ReceiptDeliveryModal } from '../../components/pos/ReceiptDeliveryModal'
import { PosReceiptSuccessModal } from './PosReceiptSuccessModal'
import { appendPosSaleHistory, primaryTenderLabel } from '../../services/posSaleHistory'
import { useAuthStore } from '../../shared/stores/authStore'
import {
  posCheckout,
  posCreateCatalogItem,
  posPrintReceipt,
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
import { printReceipt } from '../../hooks/useWebPrinter'
import { isDesktop } from '../../utils/platform'
import { connectHidScanner } from '../../hooks/useWebHidScanner'
import { BrowserCompatibilityBanner } from './BrowserCompatibilityBanner'
import { useEfdQueue } from '../../hooks/useEfdQueue'
import { usePermission } from '../../hooks/usePermission'
import { buildPosEfdCheckoutPayload } from '../../services/fiscal/efdCheckout'
import {
  formatPosMoney,
  loadRecentProducts,
  POS_MOMO_PHONE_KEY,
  saveRecentProduct,
  stockBadgeVariant,
  vatBreakdownIncl,
  type RecentProduct,
  type TenderChoice,
} from './posCheckoutUtils'
import './pos-checkout.css'

type CartLine = {
  key: string
  barcode: string
  displayName: string
  unitPrice: string
  currencyCode: string
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
  if (!w) {
    return
  }
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title></head><body>${html}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
  w.close()
}

function resetTenderState(setters: {
  setSelectedTender: (v: TenderChoice | null) => void
  setCashTendered: (v: string) => void
  setMomoVerified: (v: boolean) => void
  setAirtelVerified: (v: boolean) => void
  setMomoRef: (v: string) => void
  setAirtelRef: (v: string) => void
  setOnAcctCustomer: (v: string) => void
}) {
  setters.setSelectedTender(null)
  setters.setCashTendered('')
  setters.setMomoVerified(false)
  setters.setAirtelVerified(false)
  setters.setMomoRef('')
  setters.setAirtelRef('')
  setters.setOnAcctCustomer('')
}

export function PosCheckoutPage() {
  const { t } = useTranslation()
  const { submitEfd } = useEfdQueue()
  const searchId = useId()
  const currencyDatalistId = useId().replace(/:/g, '')
  const searchRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currency, setCurrency] = useState('RWF')
  const [register, setRegister] = useState('')
  const [customer, setCustomer] = useState('')
  const [lines, setLines] = useState<CartLine[]>([])
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [payFlash, setPayFlash] = useState(false)
  const [receipt, setReceipt] = useState<{ text: string; html: string } | null>(null)
  const [receiptSuccessOpen, setReceiptSuccessOpen] = useState(false)
  const [successReceiptNo, setSuccessReceiptNo] = useState('')
  const [printedReceipt, setPrintedReceipt] = useState<PosPrintedReceiptDto | null>(null)
  const [printingReceipt, setPrintingReceipt] = useState(false)
  const [lastSalesOrderId, setLastSalesOrderId] = useState<string | null>(null)
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>(() => loadRecentProducts())
  const [scanPreview, setScanPreview] = useState<RecentProduct | null>(null)
  const [activeResultIndex, setActiveResultIndex] = useState(0)
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
  const [selectedTender, setSelectedTender] = useState<TenderChoice | null>(null)
  const [cashTendered, setCashTendered] = useState('')
  const [momoPhone, setMomoPhone] = useState(() => localStorage.getItem(POS_MOMO_PHONE_KEY) ?? '')
  const [momoRef, setMomoRef] = useState('')
  const [airtelRef, setAirtelRef] = useState('')
  const [momoVerified, setMomoVerified] = useState(false)
  const [airtelVerified, setAirtelVerified] = useState(false)
  const [momoModalOpen, setMomoModalOpen] = useState(false)
  const [airtelModalOpen, setAirtelModalOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [deliveryChannel, setDeliveryChannel] = useState<'WHATSAPP' | 'SMS' | null>(null)
  const userId = useAuthStore((s) => s.userId)
  const canDiscount = usePermission('POS_DISCOUNT')
  const canReturns = usePermission('POS_RETURNS')
  const [discountAmount, setDiscountAmount] = useState('')
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
        saveRecentProduct(item)
        setRecentProducts(loadRecentProducts())
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
        setSearchQuery('')
        setScanPreview(null)
      } catch (e) {
        setError(normalizeApiError(e).message)
      } finally {
        setBusy(false)
        searchRef.current?.focus()
      }
    },
    [currency],
  )

  const { videoRef, scanning, startScan, stopScan } = useWebBarcode((code) => {
    void addBarcodeToCart(code)
  })

  useWebWakeLock(lines.length > 0 || scanning)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          return
        }
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!showCatalog) {
      return
    }
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
        if (!cancelled) {
          setCatalogProductsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [showCatalog])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const snapshot = [...linesRef.current]
      if (!snapshot.length) {
        return
      }
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
        if (snapKeys === curKeys) {
          setLines(next)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currency])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 4) {
      setScanPreview(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      void posScanBarcode(q)
        .then((item) => {
          if (!cancelled) {
            setScanPreview({
              barcode: item.barcode,
              displayName: item.displayName,
              unitPrice: item.unitPrice,
              currencyCode: item.currencyCode,
            })
          }
        })
        .catch(() => {
          if (!cancelled) {
            setScanPreview(null)
          }
        })
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [searchQuery])

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

  const { subtotal: subtotalDisplay, vat: vatDisplay } = useMemo(
    () => vatBreakdownIncl(payableTotal),
    [payableTotal],
  )

  const changeDue = useMemo(() => {
    if (selectedTender !== 'CASH') {
      return null
    }
    const tendered = Number(cashTendered || '0')
    const due = Number(payableTotal)
    if (!Number.isFinite(tendered) || tendered < due) {
      return null
    }
    return (tendered - due).toFixed(2)
  }, [cashTendered, payableTotal, selectedTender])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const fromRecent = recentProducts
      .filter(
        (r) =>
          !q ||
          r.displayName.toLowerCase().includes(q) ||
          r.barcode.toLowerCase().includes(q),
      )
      .slice(0, 5)
    if (scanPreview && !fromRecent.some((r) => r.barcode === scanPreview.barcode)) {
      return [scanPreview, ...fromRecent].slice(0, 5)
    }
    return fromRecent
  }, [recentProducts, scanPreview, searchQuery])

  useEffect(() => {
    setActiveResultIndex(0)
  }, [searchQuery, searchResults.length])

  const pickSearchResult = (item: RecentProduct) => {
    void addBarcodeToCart(item.barcode)
  }

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && searchResults.length > 0) {
      e.preventDefault()
      setActiveResultIndex((i) => Math.min(i + 1, searchResults.length - 1))
      return
    }
    if (e.key === 'ArrowUp' && searchResults.length > 0) {
      e.preventDefault()
      setActiveResultIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchResults.length > 0) {
        pickSearchResult(searchResults[activeResultIndex])
        return
      }
      void addBarcodeToCart(searchQuery)
    }
  }

  const bumpQty = (key: string, delta: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l,
      ),
    )
  }

  const removeLine = (key: string) => {
    setRemovingKeys((prev) => new Set(prev).add(key))
    window.setTimeout(() => {
      setLines((prev) => prev.filter((l) => l.key !== key))
      setRemovingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }, 150)
  }

  const buildTenders = (): PosTenderDto[] => {
    if (!selectedTender) {
      return []
    }
    const amount = payableTotal
    switch (selectedTender) {
      case 'CASH':
        return [{ tenderType: 'CASH', amount }]
      case 'MOMO':
        return [{ tenderType: 'MOMO', amount, reference: momoRef || momoPhone || undefined }]
      case 'AIRTEL_MONEY':
        return [{ tenderType: 'AIRTEL_MONEY', amount, reference: airtelRef || undefined }]
      case 'CARD':
        return [{ tenderType: 'CARD', amount }]
      case 'ON_ACCOUNT':
        return [{ tenderType: 'ON_ACCOUNT', amount }]
      default:
        return []
    }
  }

  const canCharge = useMemo(() => {
    if (!lines.length || !selectedTender || busy) {
      return false
    }
    if (selectedTender === 'CASH') {
      return Number(cashTendered || '0') >= Number(payableTotal)
    }
    if (selectedTender === 'MOMO') {
      return momoVerified
    }
    if (selectedTender === 'AIRTEL_MONEY') {
      return airtelVerified
    }
    if (selectedTender === 'ON_ACCOUNT') {
      return onAcctCustomer.trim().length > 0
    }
    return true
  }, [
    airtelVerified,
    busy,
    cashTendered,
    lines.length,
    momoVerified,
    onAcctCustomer,
    payableTotal,
    selectedTender,
  ])

  const clearSale = () => {
    setLines([])
    setReceipt(null)
    setReceiptSuccessOpen(false)
    setSearchQuery('')
    resetTenderState({
      setSelectedTender,
      setCashTendered,
      setMomoVerified,
      setAirtelVerified,
      setMomoRef,
      setAirtelRef,
      setOnAcctCustomer,
    })
    searchRef.current?.focus()
  }

  const pay = async () => {
    setError(null)
    if (!lines.length) {
      setError(t('pos.cartEmpty'))
      return
    }
    if (!selectedTender) {
      setError(t('pos.selectTender'))
      return
    }
    const tenders = buildTenders()
    if (selectedTender === 'ON_ACCOUNT' && !onAcctCustomer.trim()) {
      setError(t('pos.onAccountCustomerRequired'))
      return
    }
    if (lines.some((l) => l.convertError)) {
      setError(t('pos.fxRequired'))
      return
    }
    if (selectedTender === 'MOMO' && !momoVerified) {
      setMomoModalOpen(true)
      return
    }
    if (selectedTender === 'AIRTEL_MONEY' && !airtelVerified) {
      setAirtelModalOpen(true)
      return
    }
    if (selectedTender === 'CASH' && Number(cashTendered || '0') < Number(payableTotal)) {
      setError(t('pos.cashInsufficient'))
      return
    }

    const checkoutPayload = {
      customerName: customer || undefined,
      currencyCode: currency,
      posRegisterCode: register || undefined,
      lines: lines.map((l) => ({ barcode: l.barcode, quantity: String(l.quantity) })),
      tenders,
      ...(selectedTender === 'ON_ACCOUNT' ? { onAccountCustomerName: onAcctCustomer.trim() } : {}),
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine && isDesktop()) {
      setBusy(true)
      try {
        const { localId } = await queueOfflineSale(checkoutPayload)
        const offlineReceipt = `OFFLINE-${localId.slice(0, 8).toUpperCase()}`
        setLastSalesOrderId(localId)
        setSuccessReceiptNo(offlineReceipt)
        setReceipt({
          text: `Offline sale queued.\nReceipt: ${offlineReceipt}`,
          html: `<p><strong>Sale saved offline</strong></p><p>Receipt: ${offlineReceipt}</p>`,
        })
        appendPosSaleHistory({
          salesOrderId: localId,
          receiptNumber: offlineReceipt,
          createdAt: new Date().toISOString(),
          customerName: customer.trim() || 'Walk-in',
          cashierId: userId,
          registerCode: register || undefined,
          itemCount: lines.length,
          totalAmount: Number(payableTotal),
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
        setPayFlash(true)
        window.setTimeout(() => setPayFlash(false), 400)
        setReceiptSuccessOpen(true)
        setLines([])
        resetTenderState({
          setSelectedTender,
          setCashTendered,
          setMomoVerified,
          setAirtelVerified,
          setMomoRef,
          setAirtelRef,
          setOnAcctCustomer,
        })
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
      setSuccessReceiptNo(receiptNumber.slice(0, 8).toUpperCase())

      void submitEfd(
        buildPosEfdCheckoutPayload({
          salesOrderId: result.salesOrderId,
          receiptNumber,
          cartLines: cartSnapshot,
          tenders: tendersSnapshot,
          currencyCode: currency,
          totalAmount: Number(result.totalAmount ?? payableTotal),
        }),
      ).catch(() => undefined)

      appendPosSaleHistory({
        salesOrderId: result.salesOrderId,
        receiptNumber: receiptNumber.slice(0, 8).toUpperCase(),
        createdAt: new Date().toISOString(),
        customerName: customer.trim() || 'Walk-in',
        cashierId: userId,
        registerCode: register || undefined,
        itemCount: cartSnapshot.length,
        totalAmount: Number(result.totalAmount ?? payableTotal),
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

      setPayFlash(true)
      window.setTimeout(() => setPayFlash(false), 400)
      setReceiptSuccessOpen(true)
      setLines([])
      resetTenderState({
        setSelectedTender,
        setCashTendered,
        setMomoVerified,
        setAirtelVerified,
        setMomoRef,
        setAirtelRef,
        setOnAcctCustomer,
      })
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

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

  const chargeLabel = formatPosMoney(payableTotal, currency)
  const showSearchDropdown = searchQuery.trim().length > 0 && searchResults.length > 0
  const showRecent = !searchQuery.trim() && recentProducts.length > 0

  const tenderButtons: { id: TenderChoice; label: string; icon: ReactNode }[] = [
    { id: 'CASH', label: t('pos.cash'), icon: <Banknote size={20} /> },
    { id: 'MOMO', label: t('pos.momo'), icon: <Smartphone size={20} /> },
    { id: 'AIRTEL_MONEY', label: t('pos.airtel'), icon: <MessageCircle size={20} /> },
    { id: 'CARD', label: t('pos.card'), icon: <CreditCard size={20} /> },
    { id: 'ON_ACCOUNT', label: t('pos.onAccount'), icon: <FileText size={20} /> },
  ]

  return (
    <div className={`pos-checkout-v2 page-container--wide${payFlash ? ' pos-checkout-v2--flash-success' : ''}`}>
      <BrowserCompatibilityBanner />
      <video ref={videoRef} className="hidden" playsInline muted aria-hidden />

      <div className="pos-checkout-v2__toolbar">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 shrink-0 text-[var(--color-primary)]" aria-hidden />
          <h1 className="m-0 text-xl font-bold text-[var(--color-text-primary)]">{t('pos.title')}</h1>
        </div>
        <div className="pos-checkout-v2__toolbar-meta">
          {canReturns ? (
            <Link to="/returns" className="text-sm text-[var(--color-primary)] no-underline hover:underline">
              {t('nav.returns')}
            </Link>
          ) : null}
          <label>
            {t('pos.currency')}
            <input
              list={currencyDatalistId}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.trim().toUpperCase().slice(0, 8))}
              maxLength={8}
              spellCheck={false}
            />
            <datalist id={currencyDatalistId}>
              <option value="RWF" />
              <option value="USD" />
            </datalist>
          </label>
          <label>
            {t('pos.register')}
            <input value={register} onChange={(e) => setRegister(e.target.value)} placeholder="REG-01" />
          </label>
        </div>
      </div>

      <div className="pos-checkout-v2__layout">
        <div className="pos-checkout-v2__left">
          <div className="pos-search-wrap">
            <div className="pos-search">
              <Search className="pos-search__icon" size={20} aria-hidden />
              <input
                ref={searchRef}
                id={searchId}
                className="pos-search__input"
                autoComplete="off"
                placeholder={t('pos.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={onSearchKey}
                disabled={busy}
                aria-label={t('pos.scan')}
                aria-autocomplete="list"
                aria-controls={showSearchDropdown ? 'pos-search-results' : undefined}
                aria-expanded={showSearchDropdown}
              />
              <span className="pos-search__hint">{t('pos.searchFocusHint')}</span>
              {searchQuery ? (
                <button
                  type="button"
                  className="pos-search__clear"
                  aria-label={t('common.close')}
                  onClick={() => {
                    setSearchQuery('')
                    setScanPreview(null)
                    searchRef.current?.focus()
                  }}
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
            {showSearchDropdown ? (
              <ul id="pos-search-results" className="pos-search-results" role="listbox">
                {searchResults.map((item, index) => (
                  <li key={item.barcode}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeResultIndex}
                      className={`pos-search-results__item ${index === activeResultIndex ? 'pos-search-results__item--active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSearchResult(item)}
                    >
                      <span className="pos-search-results__name">{item.displayName}</span>
                      <span className="pos-search-results__barcode">{item.barcode}</span>
                      <span className="pos-search-results__price">
                        {formatPosMoney(item.unitPrice, item.currencyCode || currency)}
                      </span>
                      <span className="pos-search-results__stock">
                        <Badge variant={stockBadgeVariant('ok')} size="sm">
                          {t('pos.inStock')}
                        </Badge>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {showRecent ? (
            <div className="pos-recent">
              <p className="pos-recent__label">{t('pos.recent')}</p>
              <div className="pos-recent__scroll">
                {recentProducts.map((item) => (
                  <button
                    key={item.barcode}
                    type="button"
                    className="pos-recent__chip"
                    onClick={() => void addBarcodeToCart(item.barcode)}
                  >
                    <span className="pos-recent__chip-name">{item.displayName}</span>
                    <span className="pos-recent__chip-price">
                      {formatPosMoney(item.unitPrice, item.currencyCode || currency)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="pos-basket">
            {lines.length === 0 ? (
              <div className="pos-basket__empty">
                <ShoppingBag className="pos-basket__empty-icon" size={48} strokeWidth={1.25} />
                <p className="pos-basket__empty-title">{t('pos.basketEmptyTitle')}</p>
                <p className="pos-basket__empty-desc">{t('pos.basketEmptyDesc')}</p>
              </div>
            ) : (
              <ul className="pos-basket__list">
                {lines.map((l) => (
                  <li
                    key={l.key}
                    className={`pos-basket__row ${removingKeys.has(l.key) ? 'pos-basket__row--removing' : ''} ${l.convertError ? 'bg-amber-50' : ''}`}
                  >
                    <p className="pos-basket__name" title={l.displayName}>
                      {l.displayName}
                    </p>
                    <div className="pos-basket__qty">
                      <button
                        type="button"
                        className="pos-basket__qty-btn"
                        onClick={() => bumpQty(l.key, -1)}
                        aria-label="decrease quantity"
                      >
                        −
                      </button>
                      <span className="pos-basket__qty-val">{l.quantity}</span>
                      <button
                        type="button"
                        className="pos-basket__qty-btn"
                        onClick={() => bumpQty(l.key, 1)}
                        aria-label="increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <p className="pos-basket__line-total">{decMul(l.displayUnit, l.quantity)}</p>
                    <button
                      type="button"
                      className="pos-basket__remove"
                      onClick={() => removeLine(l.key)}
                      aria-label="remove line"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="pos-advanced">
            <summary>{t('pos.moreOptions')}</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => void startScan()} disabled={busy}>
                {scanning ? t('pos.scanWithCameraActive') : t('pos.scanWithCamera')}
              </button>
              {scanning ? (
                <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => stopScan()}>
                  {t('pos.stopCameraScan')}
                </button>
              ) : null}
              {!isDesktop() && supports.hid ? (
                <button
                  type="button"
                  className="ui-btn ui-btn--ghost ui-btn--sm"
                  onClick={() => void connectHidScanner((c) => void addBarcodeToCart(c))}
                  disabled={busy}
                >
                  {t('pos.connectUsbScanner')}
                </button>
              ) : null}
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setShowCatalog((s) => !s)}>
                {t('pos.toggleCatalog')}
              </button>
            </div>
            {showCatalog ? (
              <div className="mt-3 grid gap-2 rounded-lg bg-[var(--color-bg-hover)] p-3">
                <input className="ui-field__input" placeholder={t('pos.newBarcode')} value={nBc} onChange={(e) => setNBc(e.target.value)} />
                <input className="ui-field__input" placeholder={t('pos.newName')} value={nName} onChange={(e) => setNName(e.target.value)} />
                <input className="ui-field__input" placeholder={t('pos.newPrice')} value={nPrice} onChange={(e) => setNPrice(e.target.value)} />
                <select className="ui-field__input" value={nProductId} onChange={(e) => setNProductId(e.target.value)} disabled={catalogProductsLoading}>
                  <option value="">{t('pos.noInventoryProduct')}</option>
                  {catalogProducts.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {catalogProductsError ? <p className="text-xs text-amber-800">{t('pos.catalogProductsError')}</p> : null}
                <Button variant="secondary" size="sm" onClick={() => void saveCatalog()} loading={busy}>
                  {t('pos.saveItem')}
                </Button>
              </div>
            ) : null}
            <label className="mt-3 block text-sm">
              <span className="text-[var(--color-text-secondary)]">{t('pos.customer')}</span>
              <input
                className="ui-field__input mt-1 w-full"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder={t('pos.walkIn')}
              />
            </label>
            {canDiscount ? (
              <label className="mt-2 block text-sm">
                <span className="text-[var(--color-text-secondary)]">{t('pos.discount', { defaultValue: 'Discount' })}</span>
                <input
                  className="ui-field__input mt-1 w-full"
                  inputMode="decimal"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </label>
            ) : null}
          </details>
        </div>

        <div className="pos-checkout-v2__right">
          <section className="pos-pay-panel" aria-label={t('pos.tenders')}>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <Wallet size={18} aria-hidden />
              {t('pos.paymentPanel')}
            </div>

            <div className="pos-pay-summary">
              <div className="pos-pay-summary__row">
                <span>{t('pos.subtotal')}</span>
                <span className="num">{formatPosMoney(subtotalDisplay, currency)}</span>
              </div>
              <div className="pos-pay-summary__row">
                <span>{t('pos.vatLine')}</span>
                <span className="num">{formatPosMoney(vatDisplay, currency)}</span>
              </div>
              <hr className="pos-pay-summary__divider" />
              <div className="pos-pay-summary__total">
                <span>{t('pos.total')}</span>
                <span className="pos-pay-summary__total-value">{chargeLabel}</span>
              </div>
            </div>

            <ul className="pos-tender-list">
              {tenderButtons.map((tb) => (
                <li key={tb.id}>
                  <button
                    type="button"
                    className={`pos-tender-btn ${selectedTender === tb.id ? 'pos-tender-btn--selected' : ''}`}
                    onClick={() => {
                      setSelectedTender(tb.id)
                      setMomoVerified(false)
                      setAirtelVerified(false)
                      if (tb.id === 'CASH' && !cashTendered) {
                        setCashTendered(payableTotal)
                      }
                      if (tb.id === 'MOMO') {
                        setMomoModalOpen(true)
                      }
                      if (tb.id === 'AIRTEL_MONEY') {
                        setAirtelModalOpen(true)
                      }
                    }}
                  >
                    <span className="pos-tender-btn__icon">{tb.icon}</span>
                    {tb.label}
                    <ArrowRight className="pos-tender-btn__arrow" size={18} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>

            <div className={`pos-tender-detail ${selectedTender ? 'pos-tender-detail--open' : ''}`}>
              {selectedTender === 'CASH' ? (
                <div className="pos-tender-detail__inner">
                  <label>
                    {t('pos.amountTendered')}
                    <input
                      inputMode="decimal"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      autoFocus
                    />
                  </label>
                  {changeDue ? (
                    <p className="pos-tender-detail__change">
                      {t('pos.changeDue')}: <span className="num">{formatPosMoney(changeDue, currency)}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
              {selectedTender === 'MOMO' ? (
                <div className="pos-tender-detail__inner">
                  <label>
                    {t('pos.momoPhone')}
                    <input
                      type="tel"
                      value={momoPhone}
                      onChange={(e) => {
                        setMomoPhone(e.target.value)
                        localStorage.setItem(POS_MOMO_PHONE_KEY, e.target.value)
                      }}
                      placeholder="+250..."
                    />
                  </label>
                  <Button variant="secondary" size="sm" onClick={() => setMomoModalOpen(true)}>
                    {momoVerified ? t('pos.momoVerified', { ref: momoRef }) : t('pos.collectMomo')}
                  </Button>
                </div>
              ) : null}
              {selectedTender === 'AIRTEL_MONEY' ? (
                <div className="pos-tender-detail__inner">
                  <Button variant="secondary" size="sm" onClick={() => setAirtelModalOpen(true)}>
                    {airtelVerified ? t('pos.airtelVerified', { ref: airtelRef }) : t('pos.collectAirtel')}
                  </Button>
                </div>
              ) : null}
              {selectedTender === 'ON_ACCOUNT' ? (
                <div className="pos-tender-detail__inner">
                  <label>
                    {t('pos.onAccountCustomer')}
                    <input value={onAcctCustomer} onChange={(e) => setOnAcctCustomer(e.target.value)} />
                  </label>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="pos-charge-btn"
              disabled={!canCharge}
              onClick={() => void pay()}
            >
              {busy ? (
                <span className="pos-charge-btn__spinner" aria-hidden />
              ) : (
                <>
                  <Landmark size={20} aria-hidden />
                  {t('pos.charge', { amount: chargeLabel })}
                </>
              )}
            </button>
          </section>
        </div>
      </div>

      {error ? (
        <div className="pos-error" role="alert">
          {error}
        </div>
      ) : null}

      <PosReceiptSuccessModal
        open={receiptSuccessOpen}
        amountLabel={chargeLabel}
        receiptNumber={successReceiptNo}
        printing={printingReceipt}
        onPrint={() => {
          if (receipt?.html) {
            printHtmlFragment(receipt.html)
          } else if (printedReceipt?.escPos) {
            void printReceipt(printedReceipt.escPos)
          }
        }}
        onWhatsApp={() => {
          setDeliveryChannel('WHATSAPP')
          setDeliveryOpen(true)
        }}
        onSms={() => {
          setDeliveryChannel('SMS')
          setDeliveryOpen(true)
        }}
        onNewSale={() => {
          clearSale()
        }}
      />

      <ReceiptDeliveryModal
        receiptId={deliveryOpen ? lastSalesOrderId : null}
        defaultPhone={momoPhone || customer.trim()}
        title={deliveryChannel === 'SMS' ? t('pos.sendSms') : t('pos.sendWhatsApp')}
        onClose={() => {
          setDeliveryOpen(false)
          setDeliveryChannel(null)
        }}
      />

      <MomoPaymentModal
        open={momoModalOpen}
        amount={Number(payableTotal)}
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
        amount={Number(payableTotal)}
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
