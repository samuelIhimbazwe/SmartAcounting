import { type FormEvent, useEffect, useState } from 'react'
import { Landmark } from 'lucide-react'
import {
  confirmBankMatch,
  createBankAccount,
  getBankSummary,
  importBankStatement,
  listBankAccounts,
  listUnmatchedLines,
  postBankCharge,
  runBankAutoMatch,
  type BankAccount,
  type BankReconciliationSummary,
  type BankStatementLine,
} from '../../shared/api/bank'
import { normalizeApiError } from '../../shared/api/errors'

export function BankReconciliationPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [summary, setSummary] = useState<BankReconciliationSummary | null>(null)
  const [lines, setLines] = useState<BankStatementLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyLineId, setBusyLineId] = useState<string | null>(null)
  const [journalByLine, setJournalByLine] = useState<Record<string, string>>({})
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName, setBankName] = useState('Bank of Kigali')

  async function refreshAccounts() {
    const list = await listBankAccounts()
    setAccounts(list)
    if (!selectedId && list.length > 0) {
      setSelectedId(list[0].id)
    }
  }

  async function refreshLines(accountId: string) {
    const [s, l] = await Promise.all([getBankSummary(accountId), listUnmatchedLines(accountId)])
    setSummary(s)
    setLines(l)
  }

  useEffect(() => {
    refreshAccounts().catch((e) => setError(normalizeApiError(e).message))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setError(null)
    refreshLines(selectedId).catch((e) => setError(normalizeApiError(e).message))
  }, [selectedId])

  async function onCreateAccount(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const created = await createBankAccount({ accountName, accountNumber, bankName, currencyCode: 'RWF' })
      setAccountName('')
      setAccountNumber('')
      await refreshAccounts()
      setSelectedId(created.id)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function onImport(file: File | undefined) {
    if (!selectedId || !file) return
    setBusy(true)
    setError(null)
    try {
      await importBankStatement(selectedId, file)
      await refreshLines(selectedId)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function onAutoMatch() {
    if (!selectedId) return
    setBusy(true)
    setError(null)
    try {
      await runBankAutoMatch(selectedId)
      await refreshLines(selectedId)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function onConfirmSuggested(line: BankStatementLine) {
    if (!selectedId || !line.matchedJournalId) return
    setBusyLineId(line.id)
    setError(null)
    try {
      await confirmBankMatch(selectedId, line.id, line.matchedJournalId)
      await refreshLines(selectedId)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusyLineId(null)
    }
  }

  async function onManualMatch(line: BankStatementLine) {
    if (!selectedId) return
    const journalEntryId = (journalByLine[line.id] ?? '').trim()
    if (!journalEntryId) {
      setError('Enter a journal entry ID to match this line.')
      return
    }
    setBusyLineId(line.id)
    setError(null)
    try {
      await confirmBankMatch(selectedId, line.id, journalEntryId)
      await refreshLines(selectedId)
      setJournalByLine((prev) => {
        const next = { ...prev }
        delete next[line.id]
        return next
      })
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusyLineId(null)
    }
  }

  async function onBankCharge(line: BankStatementLine) {
    if (!selectedId) return
    setBusyLineId(line.id)
    setError(null)
    try {
      await postBankCharge(selectedId, line.id, line.description)
      await refreshLines(selectedId)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusyLineId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-2">
        <Landmark className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">Bank reconciliation</h1>
          <p className="m-0 text-sm text-neutral-600">Import CSV statements and match lines to journal entries.</p>
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <form onSubmit={onCreateAccount} className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 sm:grid-cols-3">
        <label className="text-sm">
          Account name
          <input className="mt-1 w-full rounded border px-2 py-2" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
        </label>
        <label className="text-sm">
          Account number
          <input className="mt-1 w-full rounded border px-2 py-2" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
        </label>
        <label className="text-sm">
          Bank
          <input className="mt-1 w-full rounded border px-2 py-2" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
        </label>
        <button type="submit" disabled={busy} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white sm:col-span-3">
          Add bank account
        </button>
      </form>

      {accounts.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Account
            <select className="mt-1 block rounded border px-2 py-2" value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bankName} — {a.accountName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block text-sm"
              disabled={busy || !selectedId}
              onChange={(e) => void onImport(e.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            disabled={busy || !selectedId}
            onClick={() => void onAutoMatch()}
            className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Run auto-match
          </button>
        </div>
      )}

      {summary && (
        <p className="text-sm text-neutral-700">
          Unmatched: <strong>{summary.unmatched}</strong> · Suggested: <strong>{summary.suggested}</strong> · Matched:{' '}
          <strong>{summary.matched}</strong> · Match rate: <strong>{summary.matchRate.toFixed(0)}%</strong>
        </p>
      )}

      {lines.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineBusy = busyLineId === line.id
                const isDebit = line.debitAmount != null && line.debitAmount > 0
                return (
                  <tr key={line.id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-3 py-2">{line.transactionDate}</td>
                    <td className="px-3 py-2">
                      <div>{line.description}</div>
                      {line.reference ? <div className="text-xs text-neutral-500">Ref: {line.reference}</div> : null}
                    </td>
                    <td className="px-3 py-2">
                      {line.creditAmount != null ? `+${line.creditAmount}` : line.debitAmount != null ? `-${line.debitAmount}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{line.status}</span>
                      {line.matchedJournalId ? (
                        <div className="mt-0.5 max-w-[12rem] truncate text-xs text-neutral-500" title={line.matchedJournalId}>
                          Journal: {line.matchedJournalId}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-2">
                        {line.status === 'SUGGESTED' && line.matchedJournalId ? (
                          <button
                            type="button"
                            disabled={lineBusy || busy}
                            onClick={() => void onConfirmSuggested(line)}
                            className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                          >
                            Confirm match
                          </button>
                        ) : null}
                        {line.status === 'UNMATCHED' ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              className="w-36 rounded border px-2 py-1 text-xs"
                              placeholder="Journal entry ID"
                              value={journalByLine[line.id] ?? ''}
                              onChange={(e) =>
                                setJournalByLine((prev) => ({ ...prev, [line.id]: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              disabled={lineBusy || busy}
                              onClick={() => void onManualMatch(line)}
                              className="rounded border px-2 py-1 text-xs font-medium hover:bg-neutral-50"
                            >
                              Match
                            </button>
                          </div>
                        ) : null}
                        {isDebit ? (
                          <button
                            type="button"
                            disabled={lineBusy || busy}
                            onClick={() => void onBankCharge(line)}
                            className="rounded border px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            Post bank charge
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
