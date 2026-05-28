import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createLeaveRequest,
  downloadEmployeePayslip,
  getEmployee,
  getEmployeeAttendanceSummary,
  getEmployeePayslips,
  listLeaveRequests,
  updateEmployee,
  type EmployeeDetail,
  type EmployeePayslipRow,
  type EmployeeProfileDetails,
  type LeaveRequestRow,
} from '../../shared/api/hr'
import { normalizeApiError } from '../../shared/api/errors'
import { formatDate } from '../../shared/utils/intl'
import { Button } from '../../shared/components/ui/Button'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { usePermission } from '../../shared/hooks/usePermission'

type TabId = 'personal' | 'employment' | 'leave' | 'attendance' | 'payroll'

function moneyRwf(amount: unknown) {
  const n = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n)
}

function leaveDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const canWrite = usePermission('HR_WRITE')
  const period = new Date().toISOString().slice(0, 7)
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [tab, setTab] = useState<TabId>('personal')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [leaveRows, setLeaveRows] = useState<LeaveRequestRow[]>([])
  const [attendance, setAttendance] = useState<Awaited<ReturnType<typeof getEmployeeAttendanceSummary>> | null>(null)
  const [payslips, setPayslips] = useState<EmployeePayslipRow[]>([])
  const [leaveFormOpen, setLeaveFormOpen] = useState(false)
  const [leaveType, setLeaveType] = useState('ANNUAL')
  const [leaveStart, setLeaveStart] = useState('')
  const [leaveEnd, setLeaveEnd] = useState('')
  const [leaveReason, setLeaveReason] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [detail, leaves, att, slips] = await Promise.all([
        getEmployee(id),
        listLeaveRequests({ employeeId: id, size: 50 }),
        getEmployeeAttendanceSummary(id, period),
        getEmployeePayslips(id, 6),
      ])
      setEmployee(detail)
      setLeaveRows(leaves)
      setAttendance(att)
      setPayslips(slips)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [id, period])

  useEffect(() => {
    void load()
  }, [load])

  async function saveProfile(patch: Partial<EmployeeDetail>, profilePatch?: EmployeeProfileDetails) {
    if (!id || !employee) return
    const nextName = (patch.fullName ?? employee.fullName).trim()
    if (!nextName) {
      setError('Full name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const profile = { ...(employee.profile ?? {}), ...(profilePatch ?? {}) }
      const updated = await updateEmployee(id, {
        fullName: nextName,
        department: patch.department ?? employee.department,
        title: patch.title ?? employee.title,
        status: patch.status ?? employee.status,
        phone: patch.phone ?? employee.phone ?? undefined,
        email: patch.email ?? employee.email ?? undefined,
        hireDate: patch.hireDate ?? employee.hireDate ?? undefined,
        profile,
      })
      setEmployee(updated)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLeaveRequest(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    if (!leaveStart || !leaveEnd) {
      setError('Start and end dates are required.')
      return
    }
    if (leaveEnd < leaveStart) {
      setError('End date cannot be before start date.')
      return
    }
    if (leaveReason.trim().length > 500) {
      setError('Reason must be 500 characters or fewer.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createLeaveRequest({
        employeeId: id,
        leaveType,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason.trim() || undefined,
      })
      setLeaveFormOpen(false)
      setLeaveReason('')
      setLeaveStart('')
      setLeaveEnd('')
      setLeaveRows(await listLeaveRequests({ employeeId: id, size: 50 }))
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPayslip(row: EmployeePayslipRow) {
    if (!id) return
    try {
      const blob = await downloadEmployeePayslip(row.payrollRunId, id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip-${row.period}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(normalizeApiError(e).message)
    }
  }

  if (loading && !employee) {
    return <PageSkeleton />
  }

  if (!employee || !id) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? 'Employee not found.'}</p>
        <Link to="/hr/employees" className="text-sm text-[var(--color-brand-800)] hover:underline">
          Back to employees
        </Link>
      </div>
    )
  }

  const profile = employee.profile ?? {}
  const balances = profile.leaveBalances ?? { annual: 21, sick: 10, maternity: 90 }
  const tabs: { id: TabId; label: string }[] = [
    { id: 'personal', label: 'Personal details' },
    { id: 'employment', label: 'Employment' },
    { id: 'leave', label: 'Leave' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'payroll', label: 'Payroll' },
  ]

  return (
    <div className="page-stack mx-auto max-w-5xl">
      <Link to="/hr/employees" className="text-sm text-[var(--color-brand-800)] hover:underline">
        ← Employees
      </Link>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}

      <article className="rounded-xl border bg-white p-5 shadow-sm">
        <h1 className="m-0 text-2xl font-bold text-neutral-900">{employee.fullName}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {employee.title} · {employee.department}
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase text-neutral-500">Hire date</dt>
            <dd className="font-semibold">{employee.hireDate ? formatDate(employee.hireDate) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-neutral-500">Status</dt>
            <dd className="font-semibold">{employee.status}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-neutral-500">Phone</dt>
            <dd className="font-semibold">{employee.phone ?? '—'}</dd>
          </div>
        </dl>
      </article>

      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex flex-wrap gap-4">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              className={`border-b-2 px-1 pb-2 text-sm font-medium ${
                tab === t.id
                  ? 'border-[var(--color-brand-700)] text-[var(--color-brand-800)]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'personal' ? (
        <EditableSection
          canWrite={canWrite}
          saving={saving}
          fields={[
            { key: 'fullName', label: 'Full name', value: employee.fullName },
            { key: 'phone', label: 'Phone', value: employee.phone ?? '' },
            { key: 'email', label: 'Email', value: employee.email ?? '' },
            { key: 'address', label: 'Address', value: profile.address ?? '', profile: true },
            { key: 'nationalId', label: 'National ID', value: profile.nationalId ?? '', profile: true },
            { key: 'tinNumber', label: 'TIN number', value: profile.tinNumber ?? '', profile: true },
            { key: 'rssbNumber', label: 'RSSB number', value: profile.rssbNumber ?? '', profile: true },
            { key: 'ramaNumber', label: 'RAMA number', value: profile.ramaNumber ?? '', profile: true },
            { key: 'bankName', label: 'Bank name', value: profile.bankName ?? '', profile: true },
            { key: 'bankAccount', label: 'Bank account', value: profile.bankAccount ?? '', profile: true },
            { key: 'emergencyContact', label: 'Emergency contact', value: profile.emergencyContact ?? '', profile: true },
          ]}
          onSave={(values, profileValues) =>
            void saveProfile(
              {
                fullName: values.fullName,
                phone: values.phone,
                email: values.email,
              },
              profileValues,
            )
          }
        />
      ) : null}

      {tab === 'employment' ? (
        <EditableSection
          canWrite={canWrite}
          saving={saving}
          fields={[
            { key: 'title', label: 'Job title', value: employee.title },
            { key: 'department', label: 'Department', value: employee.department },
            { key: 'contractType', label: 'Contract type', value: profile.contractType ?? 'PERMANENT', profile: true },
            { key: 'hireDate', label: 'Hire date', value: employee.hireDate ?? '', type: 'date' },
            { key: 'contractEndDate', label: 'Contract end date', value: profile.contractEndDate ?? '', profile: true, type: 'date' },
            { key: 'salary', label: 'Salary / wage (RWF)', value: String(profile.salary ?? employee.baseSalary ?? ''), profile: true },
            { key: 'location', label: 'Location assignment', value: profile.location ?? '', profile: true },
            { key: 'status', label: 'Status', value: employee.status },
          ]}
          onSave={(values, profileValues) =>
            void saveProfile(
              {
                title: values.title,
                department: values.department,
                status: values.status,
                hireDate: values.hireDate || undefined,
              },
              profileValues,
            )
          }
        />
      ) : null}

      {tab === 'leave' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {(['annual', 'sick', 'maternity'] as const).map(type => (
              <div key={type} className="rounded-xl border bg-white p-4">
                <p className="text-xs uppercase text-neutral-500">{type} leave</p>
                <p className="text-2xl font-bold">{balances[type] ?? 0} days</p>
              </div>
            ))}
          </div>
          {canWrite ? (
            <Button type="button" onClick={() => setLeaveFormOpen(v => !v)}>
              Request leave on behalf
            </Button>
          ) : null}
          {leaveFormOpen ? (
            <form className="max-w-md space-y-3 rounded-xl border bg-white p-4" onSubmit={e => void handleLeaveRequest(e)}>
              <label className="block text-sm">
                Leave type
                <select className="mt-1 w-full rounded border px-3 py-2" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                  <option value="ANNUAL">Annual</option>
                  <option value="SICK">Sick</option>
                  <option value="MATERNITY">Maternity</option>
                </select>
              </label>
              <label className="block text-sm">
                Start date
                <input type="date" className="mt-1 w-full rounded border px-3 py-2" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} required />
              </label>
              <label className="block text-sm">
                End date
                <input type="date" className="mt-1 w-full rounded border px-3 py-2" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} required />
              </label>
              <label className="block text-sm">
                Reason
                <textarea className="mt-1 w-full rounded border px-3 py-2" rows={2} value={leaveReason} onChange={e => setLeaveReason(e.target.value)} />
              </label>
              <Button type="submit" disabled={saving}>
                Submit request
              </Button>
            </form>
          ) : null}
          <section>
            <h3 className="mb-2 font-semibold">Leave history</h3>
            {leaveRows.length === 0 ? (
              <p className="text-sm text-neutral-500">No leave requests.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Dates</th>
                      <th className="px-3 py-2">Days</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRows.map(row => (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2">{row.leaveType}</td>
                        <td className="px-3 py-2">
                          {formatDate(row.startDate)} – {formatDate(row.endDate)}
                        </td>
                        <td className="px-3 py-2">{row.days ?? leaveDays(row.startDate, row.endDate)}</td>
                        <td className="px-3 py-2">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'attendance' ? (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 font-semibold">Monthly summary ({period})</h3>
          {attendance ? (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-xs text-neutral-500">Present days</dt><dd className="text-lg font-semibold">{attendance.presentDays}</dd></div>
              <div><dt className="text-xs text-neutral-500">Absences</dt><dd className="text-lg font-semibold">{attendance.absentDays}</dd></div>
              <div><dt className="text-xs text-neutral-500">Late arrivals</dt><dd className="text-lg font-semibold">{attendance.lateArrivals}</dd></div>
              <div><dt className="text-xs text-neutral-500">Overtime hours</dt><dd className="text-lg font-semibold">{attendance.overtimeHours.toFixed(1)}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-neutral-500">No attendance data for this period.</p>
          )}
        </div>
      ) : null}

      {tab === 'payroll' ? (
        <div className="space-y-4">
          <h3 className="font-semibold">Last 6 payslips</h3>
          {payslips.length === 0 ? (
            <p className="text-sm text-neutral-500">No payslips posted yet.</p>
          ) : (
            <ul className="space-y-2">
              {payslips.map(row => (
                <li key={row.lineId} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                  <span>
                    {row.period} · Net {moneyRwf(row.netPay)} · {row.status}
                  </span>
                  <Button type="button" variant="ghost" onClick={() => void handleDownloadPayslip(row)}>
                    Download payslip
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

type FieldDef = {
  key: string
  label: string
  value: string
  profile?: boolean
  type?: string
}

function EditableSection({
  canWrite,
  saving,
  fields,
  onSave,
}: {
  canWrite: boolean
  saving: boolean
  fields: FieldDef[]
  onSave: (values: Record<string, string>, profile: EmployeeProfileDetails) => void
}) {
  const [edit, setEdit] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})

  function startEdit() {
    const init: Record<string, string> = {}
    for (const f of fields) init[f.key] = f.value
    setValues(init)
    setEdit(true)
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    const profile: EmployeeProfileDetails = {}
    const top: Record<string, string> = {}
    for (const f of fields) {
      if (f.profile) {
        ;(profile as Record<string, string>)[f.key] = values[f.key] ?? ''
      } else {
        top[f.key] = values[f.key] ?? ''
      }
    }
    if (profile.salary !== undefined && profile.salary !== '') {
      profile.salary = Number(profile.salary)
    }
    onSave(top, profile)
    setEdit(false)
  }

  if (!edit) {
    return (
      <div className="rounded-xl border bg-white p-4">
        {canWrite ? (
          <div className="mb-4 flex justify-end">
            <Button type="button" variant="ghost" onClick={startEdit}>
              Edit
            </Button>
          </div>
        ) : null}
        <dl className="grid gap-3 sm:grid-cols-2">
          {fields.map(f => (
            <div key={f.key}>
              <dt className="text-xs uppercase text-neutral-500">{f.label}</dt>
              <dd className="text-sm font-medium text-neutral-900">{f.value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }

  return (
    <form className="space-y-3 rounded-xl border bg-white p-4" onSubmit={handleSave}>
      {fields.map(f => (
        <label key={f.key} className="block text-sm">
          {f.label}
          <input
            type={f.type ?? 'text'}
            className="mt-1 w-full rounded border px-3 py-2"
            value={values[f.key] ?? ''}
            onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
          />
        </label>
      ))}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="ghost" onClick={() => setEdit(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
