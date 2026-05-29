import { useEffect, useMemo, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { fetchEbmAuditLog, type EbmAuditLogRow } from '../../shared/api/compliance'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { exportRowsToCsv } from '../../shared/utils/export'
import { ComplianceSubNav } from './ComplianceSubNav'

export function AuditLogPage() {
  const [rows, setRows] = useState<EbmAuditLogRow[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchEbmAuditLog()
      .then((data) => setRows(data.items ?? []))
      .catch((e) => setError(normalizeApiError(e).message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const user = row.user ?? ''
      const action = row.action ?? ''
      const date = row.date ?? ''
      if (userFilter.trim() && !user.toLowerCase().includes(userFilter.trim().toLowerCase())) {
        return false
      }
      if (actionFilter.trim() && !action.toLowerCase().includes(actionFilter.trim().toLowerCase())) {
        return false
      }
      if (dateFrom && date && date.slice(0, 10) < dateFrom) {
        return false
      }
      if (dateTo && date && date.slice(0, 10) > dateTo) {
        return false
      }
      return true
    })
  }, [rows, userFilter, actionFilter, dateFrom, dateTo])

  function onExport() {
    if (filtered.length === 0) {
      return
    }
    exportRowsToCsv(
      filtered.map((r) => ({
        date: r.date ?? '',
        user: r.user ?? '',
        action: r.action ?? '',
        documentRef: r.documentRef ?? '',
        status: r.status ?? '',
      })),
      'compliance-audit-log',
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ComplianceSubNav />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">Compliance audit log</h1>
            <p className="m-0 text-sm text-neutral-600">Full EBM submission audit trail.</p>
          </div>
        </div>
        <button
          type="button"
          disabled={filtered.length === 0}
          onClick={onExport}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Export audit log
        </button>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          From date
          <input
            type="date"
            className="mt-1 w-full rounded border px-2 py-2"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="text-sm">
          To date
          <input
            type="date"
            className="mt-1 w-full rounded border px-2 py-2"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <label className="text-sm">
          User
          <input
            className="mt-1 w-full rounded border px-2 py-2"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="Filter by user"
          />
        </label>
        <label className="text-sm">
          Action type
          <input
            className="mt-1 w-full rounded border px-2 py-2"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="e.g. EBM_SUCCESS"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Document ref</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-neutral-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-neutral-500">
                  No audit entries match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.date ? formatDate(row.date) : '—'}
                  </td>
                  <td className="px-3 py-2">{row.user ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.action ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.documentRef ?? '—'}</td>
                  <td className="px-3 py-2">{row.status ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
