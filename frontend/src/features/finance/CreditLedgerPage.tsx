import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlowGuide } from '../../shared/components/ui/FlowGuide'
import { collectionsFlowGuide, resolveFlowGuideSteps } from '../../shared/content/flowGuides'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, LayoutGrid, RefreshCw, Table2 } from 'lucide-react'
import {
  accountingApplyPayment,
  accountingCreatePayment,
  accountingListPaymentApplications,
  financeListInvoices,
  type InvoiceLedgerRow,
  type PaymentApplicationRow,
} from '../../shared/api/finance'
import { normalizeApiError } from '../../shared/api/errors'
import { InvoiceKanbanBoard } from './components/InvoiceKanbanBoard'
import { ArAgingTable } from './components/ArAgingTable'
import { CustomerSmartButtons } from './components/CustomerSmartButtons'
import { CustomerActivityTimeline } from './components/CustomerActivityTimeline'

function useLedgerSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const viewMode = searchParams.get('view') === 'kanban' ? 'kanban' : 'table'
  const rawStatus = searchParams.get('status')
  const customerFromUrl = searchParams.get('customer') ?? ''

  const apiStatus = useMemo(() => {
    if (viewMode === 'kanban') {
      return undefined
    }
    if (rawStatus === null || rawStatus === '') {
      return 'OPEN'
    }
    if (rawStatus === 'ALL') {
      return undefined
    }
    return rawStatus
  }, [viewMode, rawStatus])

  const setViewMode = useCallback(
    (mode: 'table' | 'kanban') => {
      const next = new URLSearchParams(searchParams)
      if (mode === 'kanban') {
        next.set('view', 'kanban')
        next.delete('status')
      } else {
        next.delete('view')
        if (!next.get('status')) {
          next.set('status', 'OPEN')
        }
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const setStatusFilter = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams)
      if (value === 'OPEN') {
        next.set('status', 'OPEN')
      } else if (value === '' || value === 'ALL') {
        next.set('status', 'ALL')
      } else {
        next.set('status', value)
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const commitCustomerToUrl = useCallback(
    (draft: string) => {
      const next = new URLSearchParams(searchParams)
      const t = draft.trim()
      if (t) {
        next.set('customer', t)
      } else {
        next.delete('customer')
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return {
    viewMode,
    rawStatus,
    customerFromUrl,
    apiStatus,
    searchParams,
    setViewMode,
    setStatusFilter,
    commitCustomerToUrl,
  }
}

export function CreditLedgerPage() {
  const { t } = useTranslation()
  const collectionsGuide = useMemo(() => resolveFlowGuideSteps(t, collectionsFlowGuide), [t])
  const { viewMode, rawStatus, customerFromUrl, apiStatus, setViewMode, setStatusFilter, commitCustomerToUrl } =
    useLedgerSearchParams()

  const [rows, setRows] = useState<InvoiceLedgerRow[]>([])
  const [busy, setBusy] = useState(false)
  const [settlingInvoiceId, setSettlingInvoiceId] = useState<string | null>(null)
  const [settleDraftInvoiceId, setSettleDraftInvoiceId] = useState<string | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [historyOpenInvoiceId, setHistoryOpenInvoiceId] = useState<string | null>(null)
  const [historyLoadingInvoiceId, setHistoryLoadingInvoiceId] = useState<string | null>(null)
  const [historyByInvoiceId, setHistoryByInvoiceId] = useState<Record<string, PaymentApplicationRow[]>>({})
  const [error, setError] = useState<string | null>(null)

  const [customerDraft, setCustomerDraft] = useState(customerFromUrl)
  useEffect(() => {
    setCustomerDraft(customerFromUrl)
  }, [customerFromUrl])

  const refresh = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await financeListInvoices({
        status: apiStatus,
        customerName: customerDraft.trim() || undefined,
      })
      setRows(data)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }, [apiStatus, customerDraft])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const totals = useMemo(() => {
    const perCurrency = new Map<string, number>()
    for (const r of rows) {
      if (Number(r.outstandingAmount) <= 0) {
        continue
      }
      perCurrency.set(r.currencyCode, (perCurrency.get(r.currencyCode) ?? 0) + Number(r.outstandingAmount))
    }
    return [...perCurrency.entries()]
  }, [rows])

  const detailCustomer = customerDraft.trim()

  const paymentHistoryLoadedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    paymentHistoryLoadedRef.current.clear()
  }, [detailCustomer])

  /** Load payment applications for the filtered customer so the timeline can list payments (existing endpoint, sequential). */
  useEffect(() => {
    const name = detailCustomer
    if (!name) {
      return
    }
    const targets = rows.filter((r) => r.customerName === name).slice(0, 20)
    let cancelled = false

    void (async () => {
      for (const r of targets) {
        if (cancelled) {
          return
        }
        if (paymentHistoryLoadedRef.current.has(r.invoiceId)) {
          continue
        }
        paymentHistoryLoadedRef.current.add(r.invoiceId)
        try {
          const items = await accountingListPaymentApplications({
            targetType: 'INVOICE',
            targetId: r.invoiceId,
          })
          if (!cancelled) {
            setHistoryByInvoiceId((prev) => ({ ...prev, [r.invoiceId]: items }))
          }
        } catch {
          paymentHistoryLoadedRef.current.delete(r.invoiceId)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [detailCustomer, rows])

  const settleInvoice = useCallback(
    async (row: InvoiceLedgerRow, amountToApply: number) => {
      if (amountToApply <= 0) {
        return
      }
      setSettlingInvoiceId(row.invoiceId)
      setError(null)
      try {
        const pay = await accountingCreatePayment({
          direction: 'INCOMING',
          counterparty: row.customerName,
          amount: amountToApply.toFixed(2),
          currencyCode: row.currencyCode,
        })
        await accountingApplyPayment({
          paymentId: pay.paymentId,
          targetType: 'INVOICE',
          targetId: row.invoiceId,
          appliedAmount: amountToApply.toFixed(2),
        })
        await refresh()
      } catch (e) {
        setError(normalizeApiError(e).message)
      } finally {
        setSettlingInvoiceId(null)
      }
    },
    [refresh],
  )

  const settleDraftRow = rows.find((r) => r.invoiceId === settleDraftInvoiceId) ?? null

  const openSettleDialog = useCallback((row: InvoiceLedgerRow) => {
    const outstanding = Number(row.outstandingAmount)
    if (outstanding <= 0) {
      return
    }
    setSettleDraftInvoiceId(row.invoiceId)
    setSettleAmount(outstanding.toFixed(2))
  }, [])

  const confirmSettleDialog = useCallback(async () => {
    if (!settleDraftRow) {
      return
    }
    const outstanding = Number(settleDraftRow.outstandingAmount)
    const amountNum = Number(settleAmount || '0')
    if (amountNum <= 0 || amountNum > outstanding) {
      setError(t('creditLedger.invalidSettleAmount', { max: outstanding.toFixed(2) }))
      return
    }
    await settleInvoice(settleDraftRow, amountNum)
    setSettleDraftInvoiceId(null)
    setSettleAmount('')
  }, [settleAmount, settleDraftRow, settleInvoice, t])

  const toggleHistory = useCallback(
    async (row: InvoiceLedgerRow) => {
      if (historyOpenInvoiceId === row.invoiceId) {
        setHistoryOpenInvoiceId(null)
        return
      }
      setHistoryOpenInvoiceId(row.invoiceId)
      if (historyByInvoiceId[row.invoiceId]) {
        return
      }
      setHistoryLoadingInvoiceId(row.invoiceId)
      try {
        const items = await accountingListPaymentApplications({
          targetType: 'INVOICE',
          targetId: row.invoiceId,
        })
        paymentHistoryLoadedRef.current.add(row.invoiceId)
        setHistoryByInvoiceId((prev) => ({ ...prev, [row.invoiceId]: items }))
      } catch (e) {
        setError(normalizeApiError(e).message)
      } finally {
        setHistoryLoadingInvoiceId(null)
      }
    },
    [historyByInvoiceId, historyOpenInvoiceId],
  )

  const selectCustomer = useCallback(
    (name: string) => {
      setCustomerDraft(name)
      commitCustomerToUrl(name)
    },
    [commitCustomerToUrl],
  )

  const statusSelectValue =
    rawStatus === null || rawStatus === '' ? 'OPEN' : rawStatus === 'ALL' ? 'ALL' : rawStatus

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">{t('creditLedger.title')}</h1>
            <p className="m-0 text-sm text-neutral-600">{t('creditLedger.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          onClick={() => void refresh()}
          disabled={busy}
        >
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          {t('creditLedger.refresh')}
        </button>
      </header>

      <FlowGuide title={collectionsGuide.title} steps={collectionsGuide.steps} />

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-neutral-500">{t('creditLedger.viewMode')}</span>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm ${
              viewMode === 'table' ? 'border-[var(--color-brand-300)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]' : 'border-[var(--border-default)] bg-[var(--color-surface)]'
            }`}
            onClick={() => setViewMode('table')}
          >
            <Table2 className="h-4 w-4" aria-hidden />
            {t('creditLedger.viewTable')}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm ${
              viewMode === 'kanban' ? 'border-[var(--color-brand-300)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]' : 'border-[var(--border-default)] bg-[var(--color-surface)]'
            }`}
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            {t('creditLedger.viewKanban')}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-neutral-600">{t('creditLedger.status')}</span>
            <select
              className="mt-1 w-full rounded border px-2 py-2"
              value={statusSelectValue}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={viewMode === 'kanban'}
            >
              <option value="OPEN">OPEN</option>
              <option value="ALL">ALL</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-neutral-600">{t('creditLedger.customer')}</span>
            <input
              className="mt-1 w-full rounded border px-2 py-2"
              value={customerDraft}
              onChange={(e) => setCustomerDraft(e.target.value)}
              onBlur={() => commitCustomerToUrl(customerDraft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitCustomerToUrl(customerDraft)
                }
              }}
              placeholder={t('creditLedger.customerPlaceholder')}
            />
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <CustomerSmartButtons customerName={detailCustomer} rows={rows} historyByInvoiceId={historyByInvoiceId} />

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-semibold">{t('creditLedger.openTotals')}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {totals.map(([cur, amt]) => (
            <span key={cur} className="rounded-full bg-[var(--surface-overlay)] px-3 py-1">
              {cur}: {amt.toFixed(2)}
            </span>
          ))}
          {!totals.length && <span className="text-neutral-500">{t('creditLedger.none')}</span>}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-semibold">{t('creditLedger.agingTitle')}</h2>
        <div className="mt-3">
          <ArAgingTable rows={rows} />
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-semibold">{t('creditLedger.invoices')}</h2>
        <div className="mt-3">
          {viewMode === 'kanban' ? (
            <InvoiceKanbanBoard
              rows={rows}
              onSelectCustomer={selectCustomer}
              onOpenSettle={openSettleDialog}
              onToggleHistory={(r) => void toggleHistory(r)}
            />
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="py-2 pr-2">{t('creditLedger.customer')}</th>
                    <th className="py-2 pr-2">{t('creditLedger.amount')}</th>
                    <th className="py-2 pr-2">{t('creditLedger.outstanding')}</th>
                    <th className="py-2 pr-2">{t('creditLedger.status')}</th>
                    <th className="py-2 pr-2">{t('creditLedger.dueDate')}</th>
                    <th className="py-2 pr-2">{t('creditLedger.actions')}</th>
                    <th className="py-2">invoiceId</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <Fragment key={r.invoiceId}>
                      <tr className="border-b border-neutral-100">
                        <td className="py-2 pr-2">
                          {r.customerId ? (
                            <Link
                              className="font-medium text-[var(--color-brand-800)] hover:underline"
                              to={`/finance/customers/${r.customerId}`}
                            >
                              {r.customerName}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="text-left font-medium hover:underline"
                              onClick={() => selectCustomer(r.customerName)}
                            >
                              {r.customerName}
                            </button>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          {r.amount} {r.currencyCode}
                        </td>
                        <td className="py-2 pr-2 font-semibold">
                          {r.outstandingAmount} {r.currencyCode}
                        </td>
                        <td className="py-2 pr-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${r.overdue ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-700'}`}
                          >
                            {r.overdue ? 'OVERDUE' : r.status}
                          </span>
                        </td>
                        <td className="py-2 pr-2">{r.dueDate ?? 'â€”'}</td>
                        <td className="py-2 pr-2">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800 disabled:opacity-50"
                              onClick={() => openSettleDialog(r)}
                              disabled={settlingInvoiceId === r.invoiceId || Number(r.outstandingAmount) <= 0}
                            >
                              {settlingInvoiceId === r.invoiceId ? t('creditLedger.settling') : t('creditLedger.settleNow')}
                            </button>
                            <button
                              type="button"
                              className="rounded border border-[var(--border-subtle)] bg-[var(--color-surface)] px-2 py-1 text-xs"
                              onClick={() => void toggleHistory(r)}
                            >
                              {historyOpenInvoiceId === r.invoiceId ? t('creditLedger.hideHistory') : t('creditLedger.history')}
                            </button>
                          </div>
                        </td>
                        <td className="py-2 font-mono text-xs">{r.invoiceId}</td>
                      </tr>
                      {historyOpenInvoiceId === r.invoiceId && (
                        <tr className="border-b border-neutral-100 bg-[var(--surface-overlay)]">
                          <td colSpan={7} className="px-2 py-2">
                            {historyLoadingInvoiceId === r.invoiceId ? (
                              <span className="text-xs text-neutral-500">{t('creditLedger.loadingHistory')}</span>
                            ) : (
                              <div className="space-y-1 text-xs">
                                {(historyByInvoiceId[r.invoiceId] ?? []).map((h) => (
                                  <div key={h.applicationId} className="flex flex-wrap gap-3 rounded bg-[var(--color-surface)] px-2 py-1">
                                    <span>
                                      {t('creditLedger.appliedOn')}: {new Date(h.createdAt).toLocaleString()}
                                    </span>
                                    <span>
                                      {t('creditLedger.amount')}: {h.appliedAmount} {h.currencyCode ?? r.currencyCode}
                                    </span>
                                    <span>
                                      {t('creditLedger.counterparty')}: {h.counterparty ?? 'â€”'}
                                    </span>
                                    <span>
                                      {t('creditLedger.paymentId')}: <code>{h.paymentId}</code>
                                    </span>
                                  </div>
                                ))}
                                {!(historyByInvoiceId[r.invoiceId] ?? []).length && (
                                  <span className="text-neutral-500">{t('creditLedger.noHistory')}</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-neutral-500">
                        {t('creditLedger.none')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <CustomerActivityTimeline customerName={detailCustomer} rows={rows} historyByInvoiceId={historyByInvoiceId} />

      {settleDraftRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] p-4 shadow-xl">
            <h3 className="mt-0 text-lg font-semibold">{t('creditLedger.confirmSettleTitle')}</h3>
            <p className="text-sm text-neutral-600">
              {t('creditLedger.confirmSettleText', {
                customer: settleDraftRow.customerName,
                currency: settleDraftRow.currencyCode,
                max: settleDraftRow.outstandingAmount,
              })}
            </p>
            <label className="block text-sm">
              <span className="text-neutral-600">{t('creditLedger.applyAmount')}</span>
              <input
                className="mt-1 w-full rounded border px-2 py-2 font-mono"
                inputMode="decimal"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => {
                  setSettleDraftInvoiceId(null)
                  setSettleAmount('')
                }}
                disabled={Boolean(settlingInvoiceId)}
              >
                {t('creditLedger.cancel')}
              </button>
              <button
                type="button"
                className="rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={() => void confirmSettleDialog()}
                disabled={Boolean(settlingInvoiceId)}
              >
                {settlingInvoiceId ? t('creditLedger.settling') : t('creditLedger.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
