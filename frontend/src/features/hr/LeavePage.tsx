import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  approveLeaveRequest,
  listLeaveRequests,
  rejectLeaveRequest,
  type LeaveRequestRow,
} from '../../shared/api/hr'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { Button } from '../../shared/components/ui/Button'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { usePermission } from '../../shared/hooks/usePermission'

function statusBadge(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-900'
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-900'
    case 'REJECTED':
      return 'bg-red-100 text-red-900'
    default:
      return 'bg-neutral-100 text-neutral-700'
  }
}

export function LeavePage() {
  const canWrite = usePermission('HR_WRITE')
  const [rows, setRows] = useState<LeaveRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(
        await listLeaveRequests({
          leaveType: typeFilter || undefined,
          status: statusFilter || undefined,
          size: 200,
        }),
      )
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const pending = useMemo(() => rows.filter(r => r.status.toUpperCase() === 'PENDING'), [rows])

  const filtered = useMemo(() => {
    return rows.filter(row => {
      if (employeeFilter.trim()) {
        const q = employeeFilter.trim().toLowerCase()
        if (!(row.employeeName ?? '').toLowerCase().includes(q)) return false
      }
      if (fromDate && row.startDate < fromDate) return false
      if (toDate && row.endDate > toDate) return false
      return true
    })
  }, [rows, employeeFilter, fromDate, toDate])

  async function handleApprove(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await approveLeaveRequest(id)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await rejectLeaveRequest(id)
      await load()
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading && rows.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="page-stack mx-auto max-w-6xl">
      <div>
        <h1 className="m-0 text-2xl font-bold text-neutral-900">Leave management</h1>
        <p className="mt-1 text-sm text-neutral-600">Review pending requests and browse leave history.</p>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pending approvals</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-neutral-500">No pending leave requests.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Dates</th>
                  <th className="px-3 py-2">Days</th>
                  <th className="px-3 py-2">Reason</th>
                  {canWrite ? <th className="px-3 py-2">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {pending.map(row => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.employeeName ?? row.employeeId.slice(0, 8)}</td>
                    <td className="px-3 py-2">{row.leaveType}</td>
                    <td className="px-3 py-2">
                      {formatDate(row.startDate)} – {formatDate(row.endDate)}
                    </td>
                    <td className="px-3 py-2">{row.days ?? '—'}</td>
                    <td className="px-3 py-2">{row.reason ?? '—'}</td>
                    {canWrite ? (
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button type="button" disabled={busyId === row.id} onClick={() => void handleApprove(row.id)}>
                            Approve
                          </Button>
                          <Button type="button" variant="ghost" disabled={busyId === row.id} onClick={() => void handleReject(row.id)}>
                            Reject
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All leave requests</h2>
        <div className="flex flex-wrap gap-3">
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Filter by employee name"
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
          />
          <select className="rounded-lg border px-3 py-2 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="ANNUAL">Annual</option>
            <option value="SICK">Sick</option>
            <option value="MATERNITY">Maternity</option>
          </select>
          <select className="rounded-lg border px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <input type="date" className="rounded-lg border px-3 py-2 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input type="date" className="rounded-lg border px-3 py-2 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Dates</th>
                <th className="px-3 py-2">Days</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{row.employeeName ?? row.employeeId.slice(0, 8)}</td>
                  <td className="px-3 py-2">{row.leaveType}</td>
                  <td className="px-3 py-2">
                    {formatDate(row.startDate)} – {formatDate(row.endDate)}
                  </td>
                  <td className="px-3 py-2">{row.days ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
