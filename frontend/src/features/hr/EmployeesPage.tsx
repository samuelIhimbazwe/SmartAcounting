import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Users } from 'lucide-react'
import {
  createEmployee,
  listEmployees,
  type CreateEmployeePayload,
  type EmployeeSummary,
} from '../../shared/api/hr'
import { normalizeApiError } from '../../shared/api/errors'
import { Button } from '../../shared/components/ui/Button'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { usePermission } from '../../shared/hooks/usePermission'

function statusTone(status: string): string {
  return status.toUpperCase() === 'ACTIVE' ? 'text-emerald-700' : 'text-neutral-500'
}

export function EmployeesPage() {
  const canWrite = usePermission('HR_WRITE')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [rows, setRows] = useState<EmployeeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [dept, setDept] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(
        await listEmployees({
          q: search.trim() || undefined,
          department: department || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          size: 200,
        }),
      )
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [search, department, statusFilter])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(t)
  }, [load])

  const departments = useMemo(
    () => [...new Set(rows.map(r => r.department).filter(Boolean))].sort(),
    [rows],
  )

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !dept.trim() || !title.trim()) {
      setError('Name, department, and job title are required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const payload: CreateEmployeePayload = {
        fullName: fullName.trim(),
        department: dept.trim(),
        title: title.trim(),
      }
      const { employeeId } = await createEmployee(payload)
      setFormOpen(false)
      setFullName('')
      setDept('')
      setTitle('')
      await load()
      window.location.assign(`/hr/employees/${employeeId}`)
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading && rows.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="page-stack mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-neutral-900">
            <Users className="h-7 w-7 text-[var(--color-brand-700)]" />
            Employees
          </h1>
          <p className="mt-1 text-sm text-neutral-600">Employee master records and profiles.</p>
        </div>
        {canWrite ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            <UserPlus className="mr-1 inline h-4 w-4" />
            Add employee
          </Button>
        ) : null}
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <input
          className="min-w-[220px] flex-1 rounded-lg border px-3 py-2 text-sm"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={department}
          onChange={e => setDepartment(e.target.value)}
        >
          <option value="">All departments</option>
          {departments.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active only</option>
          <option value="INACTIVE">Inactive only</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-600">
          No employees match your filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Job title</th>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2 font-medium text-neutral-900">{row.fullName}</td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">{row.department}</td>
                  <td className="px-3 py-2">{row.phone ?? '—'}</td>
                  <td className={`px-3 py-2 font-medium ${statusTone(row.status)}`}>{row.status}</td>
                  <td className="px-3 py-2">
                    <Link to={`/hr/employees/${row.id}`}>
                      <Button type="button" variant="ghost">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onSubmit={e => void handleCreate(e)}
          >
            <h2 className="mb-4 text-lg font-semibold">Add employee</h2>
            <label className="mb-3 block text-sm">
              Full name *
              <input className="mt-1 w-full rounded border px-3 py-2" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </label>
            <label className="mb-3 block text-sm">
              Department *
              <input className="mt-1 w-full rounded border px-3 py-2" value={dept} onChange={e => setDept(e.target.value)} required />
            </label>
            <label className="mb-4 block text-sm">
              Job title *
              <input className="mt-1 w-full rounded border px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} required />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Creating…' : 'Create employee'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
