import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import {
  journalsCreate,
  journalsGet,
  journalsList,
  journalsListAccounts,
  journalsNextReference,
  journalsPost,
  journalsReverse,
  type JournalDetail,
  type JournalLine,
  type JournalSummary,
  type LedgerAccountOption,
} from '../../shared/api/journals'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

type DraftLine = {
  key: string
  account: string
  description: string
  debit: string
  credit: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function money(n: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'USD',
    maximumFractionDigits: 2,
  }).format(n)
}

function parseAmount(value: string) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function emptyLine(defaultAccount = ''): DraftLine {
  return {
    key: crypto.randomUUID(),
    account: defaultAccount,
    description: '',
    debit: '',
    credit: '',
  }
}

function accountLabel(account: LedgerAccountOption) {
  return `${account.accountCode} — ${account.accountName}`
}

function statusBadge(status: string) {
  const normalized = status?.toUpperCase() ?? ''
  if (normalized === 'POSTED') {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Posted</span>
  }
  if (normalized === 'DRAFT') {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Draft</span>
  }
  if (normalized === 'REVERSED') {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Reversed</span>
  }
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{status}</span>
}

export function JournalsPage() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<JournalSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<JournalDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [entryDate, setEntryDate] = useState(todayIso())
  const [description, setDescription] = useState('')
  const [currencyCode, setCurrencyCode] = useState('FRW')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [accounts, setAccounts] = useState<LedgerAccountOption[]>([])
  const [reverseBusy, setReverseBusy] = useState(false)

  const defaultAccount = accounts[0]?.accountCode ?? ''

  useEffect(() => {
    void journalsListAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]))
  }, [])

  useEffect(() => {
    if (accounts.length > 0 && lines.length === 0) {
      setLines([emptyLine(defaultAccount), emptyLine(defaultAccount)])
    }
  }, [accounts, defaultAccount, lines.length])

  const refresh = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await journalsList({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        account: accountFilter.trim() || undefined,
        status: statusFilter || undefined,
      })
      setRows(data)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [accountFilter, fromDate, statusFilter, toDate])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const data = await journalsGet(id)
      setDetail(data)
    } catch (e) {
      setDetailError(normalizeApiError(e).message)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const openModal = useCallback(async () => {
    setFormError(null)
    setEntryDate(todayIso())
    setDescription('')
    setCurrencyCode('FRW')
    setLines([emptyLine(defaultAccount), emptyLine(defaultAccount)])
    setModalOpen(true)
    try {
      const ref = await journalsNextReference(todayIso())
      setReferenceNumber(ref)
    } catch {
      setReferenceNumber('')
    }
  }, [defaultAccount])

  const totals = useMemo(() => {
    let debitTotal = 0
    let creditTotal = 0
    for (const line of lines) {
      debitTotal += parseAmount(line.debit)
      creditTotal += parseAmount(line.credit)
    }
    return { debitTotal, creditTotal }
  }, [lines])

  const balanced = totals.debitTotal > 0 && totals.debitTotal === totals.creditTotal

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const buildPayloadLines = (): JournalLine[] =>
    lines
      .map((line) => ({
        account: line.account,
        description: line.description,
        debit: parseAmount(line.debit),
        credit: parseAmount(line.credit),
      }))
      .filter((line) => line.debit > 0 || line.credit > 0)

  const submitEntry = async (post: boolean) => {
    if (!description.trim()) {
      setFormError(t('journals.errors.descriptionRequired'))
      return
    }
    if (post && !balanced) {
      setFormError(t('journals.errors.mustBalance'))
      return
    }
    setFormBusy(true)
    setFormError(null)
    try {
      const payloadLines = buildPayloadLines()
      if (payloadLines.length < 2) {
        setFormError(t('journals.errors.minLines'))
        return
      }
      const { journalEntryId } = await journalsCreate({
        referenceNumber: referenceNumber || undefined,
        entryDate,
        description: description.trim(),
        currencyCode,
        lines: payloadLines,
        post,
      })
      setModalOpen(false)
      await refresh()
      await openDetail(journalEntryId)
    } catch (e) {
      setFormError(normalizeApiError(e).message)
    } finally {
      setFormBusy(false)
    }
  }

  const handleReverse = async () => {
    if (!detail) {
      return
    }
    setReverseBusy(true)
    setDetailError(null)
    try {
      const { journalEntryId } = await journalsReverse(detail.id)
      await refresh()
      await openDetail(journalEntryId)
    } catch (e) {
      setDetailError(normalizeApiError(e).message)
    } finally {
      setReverseBusy(false)
    }
  }

  const handlePostDraft = async () => {
    if (!detail) {
      return
    }
    setDetailError(null)
    try {
      await journalsPost(detail.id)
      await refresh()
      await openDetail(detail.id)
    } catch (e) {
      setDetailError(normalizeApiError(e).message)
    }
  }

  if (loading && rows.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.journals')}</h1>
          <p className="text-sm text-slate-600 mt-1">{t('journals.subtitle')}</p>
        </div>
        <button
          type="button"
          disabled={accounts.length === 0}
          onClick={() => void openModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t('journals.newEntry')}
        </button>
      </div>

      <section className="rounded-xl border bg-white p-4 space-y-4">
        <h2 className="text-lg font-medium">{t('journals.recent')}</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="block text-slate-600 mb-1">{t('journals.fromDate')}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md border px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-600 mb-1">{t('journals.toDate')}</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-md border px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-600 mb-1">{t('journals.account')}</span>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full rounded-md border px-2 py-1.5"
            >
              <option value="">{t('common.all')}</option>
              {accounts.map((account) => (
                <option key={account.accountCode} value={account.accountCode}>
                  {accountLabel(account)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-slate-600 mb-1">{t('journals.status')}</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border px-2 py-1.5"
            >
              <option value="">{t('common.all')}</option>
              <option value="POSTED">{t('journals.statusPosted')}</option>
              <option value="DRAFT">{t('journals.statusDraft')}</option>
              <option value="REVERSED">{t('journals.statusReversed')}</option>
            </select>
          </label>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="py-2 pr-3">{t('journals.colDate')}</th>
                <th className="py-2 pr-3">{t('journals.colReference')}</th>
                <th className="py-2 pr-3">{t('journals.colDescription')}</th>
                <th className="py-2 pr-3 text-right">{t('journals.colDebit')}</th>
                <th className="py-2 pr-3 text-right">{t('journals.colCredit')}</th>
                <th className="py-2 pr-3">{t('journals.colPostedBy')}</th>
                <th className="py-2">{t('journals.status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b cursor-pointer hover:bg-slate-50 ${selectedId === row.id ? 'bg-indigo-50' : ''}`}
                  onClick={() => void openDetail(row.id)}
                >
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDate(row.entryDate)}</td>
                  <td className="py-2 pr-3 font-medium">{row.referenceNumber}</td>
                  <td className="py-2 pr-3 max-w-xs truncate">{row.description}</td>
                  <td className="py-2 pr-3 text-right">{money(Number(row.debitTotal), row.currencyCode)}</td>
                  <td className="py-2 pr-3 text-right">{money(Number(row.creditTotal), row.currencyCode)}</td>
                  <td className="py-2 pr-3">{row.postedBy ?? '—'}</td>
                  <td className="py-2">{statusBadge(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="text-sm text-slate-500 py-4">{t('common.empty')}</p> : null}
        </div>
      </section>

      {selectedId ? (
        <section className="rounded-xl border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">{t('journals.detail')}</h2>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700"
              onClick={() => {
                setSelectedId(null)
                setDetail(null)
              }}
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {detailLoading ? <PageSkeleton /> : null}
          {detailError ? <p className="text-sm text-red-600">{detailError}</p> : null}
          {detail ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <p><span className="text-slate-600">{t('journals.colReference')}:</span> {detail.referenceNumber}</p>
                <p><span className="text-slate-600">{t('journals.colDate')}:</span> {formatDate(detail.entryDate)}</p>
                <p className="sm:col-span-2"><span className="text-slate-600">{t('journals.colDescription')}:</span> {detail.description}</p>
                <p><span className="text-slate-600">{t('journals.status')}:</span> {statusBadge(detail.status)}</p>
                <p><span className="text-slate-600">{t('journals.colPostedBy')}:</span> {detail.postedBy ?? '—'}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-600">
                      <th className="py-2 pr-3">{t('journals.account')}</th>
                      <th className="py-2 pr-3">{t('journals.colDescription')}</th>
                      <th className="py-2 pr-3 text-right">{t('journals.colDebit')}</th>
                      <th className="py-2 pr-3 text-right">{t('journals.colCredit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((line, idx) => (
                      <tr key={`${line.account}-${idx}`} className="border-b">
                        <td className="py-2 pr-3 font-medium">{line.account}</td>
                        <td className="py-2 pr-3">{line.description || '—'}</td>
                        <td className="py-2 pr-3 text-right">
                          {Number(line.debit) > 0 ? money(Number(line.debit), detail.currencyCode) : '—'}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {Number(line.credit) > 0 ? money(Number(line.credit), detail.currencyCode) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                {detail.status === 'DRAFT' ? (
                  <button
                    type="button"
                    disabled={Number(detail.debitTotal) !== Number(detail.creditTotal)}
                    onClick={() => void handlePostDraft()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {t('journals.postJournal')}
                  </button>
                ) : null}
                {detail.status === 'POSTED' && !detail.reversedFromId ? (
                  <button
                    type="button"
                    disabled={reverseBusy}
                    onClick={() => void handleReverse()}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    {reverseBusy ? t('common.loading') : t('journals.reverseJournal')}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-modal-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="journal-modal-title" className="text-lg font-semibold">{t('journals.newEntry')}</h2>
              <button type="button" onClick={() => setModalOpen(false)} aria-label={t('common.close')}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="block text-slate-600 mb-1">{t('journals.colReference')}</span>
                <input
                  readOnly
                  value={referenceNumber}
                  className="w-full rounded-md border bg-slate-50 px-2 py-1.5"
                />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 mb-1">{t('journals.colDate')}</span>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => {
                    setEntryDate(e.target.value)
                    void journalsNextReference(e.target.value).then(setReferenceNumber).catch(() => undefined)
                  }}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block text-slate-600 mb-1">{t('journals.colDescription')}</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5"
                />
              </label>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-slate-600">
                    <th className="py-2 px-2">{t('journals.account')}</th>
                    <th className="py-2 px-2">{t('journals.colDescription')}</th>
                    <th className="py-2 px-2 text-right">{t('journals.colDebit')}</th>
                    <th className="py-2 px-2 text-right">{t('journals.colCredit')}</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="border-b">
                      <td className="p-2">
                        <select
                          value={line.account}
                          onChange={(e) => updateLine(line.key, { account: e.target.value })}
                          className="w-full min-w-[140px] rounded-md border px-2 py-1"
                        >
                          {accounts.map((account) => (
                            <option key={account.accountCode} value={account.accountCode}>
                              {accountLabel(account)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          value={line.description}
                          onChange={(e) => updateLine(line.key, { description: e.target.value })}
                          className="w-full min-w-[120px] rounded-md border px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit}
                          onChange={(e) => updateLine(line.key, { debit: e.target.value, credit: e.target.value ? '' : line.credit })}
                          className="w-full min-w-[90px] rounded-md border px-2 py-1 text-right"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit}
                          onChange={(e) => updateLine(line.key, { credit: e.target.value, debit: e.target.value ? '' : line.debit })}
                          className="w-full min-w-[90px] rounded-md border px-2 py-1 text-right"
                        />
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          disabled={lines.length <= 2}
                          onClick={() => setLines((prev) => prev.filter((row) => row.key !== line.key))}
                          className="text-slate-500 hover:text-red-600 disabled:opacity-30"
                          aria-label={t('common.remove')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine(defaultAccount)])}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              + {t('journals.addLine')}
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div>
                <span className="text-slate-600">{t('journals.runningTotal')}:</span>{' '}
                {money(totals.debitTotal, currencyCode)} / {money(totals.creditTotal, currencyCode)}
              </div>
              <div className={balanced ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                {balanced ? `✅ ${t('journals.balanced')}` : `❌ ${t('journals.outOfBalance')}`}
              </div>
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={formBusy}
                onClick={() => void submitEntry(false)}
                className="rounded-lg border border-indigo-600 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
              >
                {t('journals.saveDraft')}
              </button>
              <button
                type="button"
                disabled={formBusy || !balanced}
                onClick={() => void submitEntry(true)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {t('journals.postJournal')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
