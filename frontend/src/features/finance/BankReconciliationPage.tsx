import { type FormEvent, useEffect, useState } from 'react'
import { Landmark } from 'lucide-react'
import {
  createBankAccount,
  getBankSummary,
  importBankStatement,
  listBankAccounts,
  listUnmatchedLines,
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

  useEffect(() => {
    refreshAccounts().catch((e) => setError(normalizeApiError(e).message))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setError(null)
    Promise.all([getBankSummary(selectedId), listUnmatchedLines(selectedId)])
      .then(([s, l]) => {
        setSummary(s)
        setLines(l)
      })
      .catch((e) => setError(normalizeApiError(e).message))
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
      const [s, l] = await Promise.all([getBankSummary(selectedId), listUnmatchedLines(selectedId)])
      setSummary(s)
      setLines(l)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-2">
        <Landmark className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">Bank reconciliation</h1>
          <p className="m-0 text-sm text-neutral-600">Import CSV statements and match lines to journal entries (Sprint 1.1).</p>
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
        </div>
      )}

      {summary && (
        <p className="text-sm text-neutral-700">
          Unmatched: <strong>{summary.unmatched}</strong> · Matched: <strong>{summary.matched}</strong> · Match rate:{' '}
          <strong>{(summary.matchRate * 100).toFixed(0)}%</strong>
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
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2">{line.transactionDate}</td>
                  <td className="px-3 py-2">{line.description}</td>
                  <td className="px-3 py-2">
                    {line.creditAmount != null ? `+${line.creditAmount}` : line.debitAmount != null ? `-${line.debitAmount}` : '—'}
                  </td>
                  <td className="px-3 py-2">{line.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
