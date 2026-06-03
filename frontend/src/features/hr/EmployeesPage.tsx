import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { UserPlus, Users } from 'lucide-react'
import {
  createEmployee,
  listEmployees,
  type CreateEmployeePayload,
  type EmployeeSummary,
} from '../../shared/api/hr'
import { normalizeApiError } from '../../shared/api/errors'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { usePermission } from '../../shared/hooks/usePermission'
import {
  FormActions,
  FormField,
  FormStack,
  Input,
  Modal,
  useFieldValidation,
} from '../../components/ui'

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

  const formValues = { fullName, dept, title }
  const { errors, valid, onBlur, validateAll } = useFieldValidation(formValues, {
    fullName: value => (String(value ?? '').trim() ? undefined : 'Full name is required.'),
    dept: value => (String(value ?? '').trim() ? undefined : 'Department is required.'),
    title: value => (String(value ?? '').trim() ? undefined : 'Job title is required.'),
  })

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

  const columns = useMemo((): DataTableColumn<EmployeeSummary>[] => [
    { key: 'fullName', header: 'Name' },
    { key: 'title', header: 'Job title' },
    { key: 'department', header: 'Department' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status', columnType: 'status' },
  ], [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!validateAll()) {
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
        <Input
          className="min-w-[220px] flex-1"
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

      <DataTable
        columns={columns}
        rows={rows}
        isLoading={loading}
        getRowKey={row => row.id}
        primaryAction={{
          label: 'View',
          href: row => `/hr/employees/${row.id}`,
        }}
        emptyStateLabel="No employees yet"
        noResultsLabel="No employees match your filters"
        exportFilename="employees"
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add employee" size="sm">
        <form onSubmit={e => void handleCreate(e)}>
          <FormStack>
            <FormField label="Full name" required error={errors.fullName} valid={valid.fullName}>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onBlur={() => onBlur('fullName')}
                required
              />
            </FormField>
            <FormField label="Department" required error={errors.dept} valid={valid.dept}>
              <Input
                value={dept}
                onChange={e => setDept(e.target.value)}
                onBlur={() => onBlur('dept')}
                required
              />
            </FormField>
            <FormField label="Job title" required error={errors.title} valid={valid.title}>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => onBlur('title')}
                required
              />
            </FormField>
          </FormStack>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create employee'}
            </Button>
          </FormActions>
        </form>
      </Modal>
    </div>
  )
}
