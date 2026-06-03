import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  assignShift,
  createShift,
  getWeeklyRoster,
  listEmployees,
  listShifts,
  type EmployeeSummary,
  type ShiftAssignmentRow,
  type ShiftRow,
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

type RosterRow = {
  id: string
  shiftLabel: string
  shiftMeta: string
} & Record<string, string>

function mondayOfWeek(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date.toISOString().slice(0, 10)
}

function weekDates(weekStart: string): string[] {
  const start = new Date(weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function ShiftsPage() {
  const canWrite = usePermission('HR_WRITE')
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(new Date()))
  const [locationFilter, setLocationFilter] = useState('')
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [assignments, setAssignments] = useState<ShiftAssignmentRow[]>([])
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [shiftName, setShiftName] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [location, setLocation] = useState('')
  const [assignShiftId, setAssignShiftId] = useState('')
  const [assignEmployeeId, setAssignEmployeeId] = useState('')
  const [assignDate, setAssignDate] = useState('')
  const [busy, setBusy] = useState(false)

  const days = useMemo(() => weekDates(weekStart), [weekStart])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [shiftRows, roster, staff] = await Promise.all([
        listShifts(),
        getWeeklyRoster(weekStart),
        listEmployees({ status: 'ACTIVE', size: 200 }),
      ])
      setShifts(shiftRows)
      setAssignments(roster)
      setEmployees(staff)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    void load()
  }, [load])

  const filteredShifts = useMemo(
    () => shifts.filter(s => !locationFilter || (s.location ?? '').toLowerCase() === locationFilter.toLowerCase()),
    [shifts, locationFilter],
  )

  const locations = useMemo(
    () => [...new Set(shifts.map(s => s.location).filter(Boolean))] as string[],
    [shifts],
  )

  const employeeName = useMemo(() => {
    const map = new Map(employees.map(e => [e.id, e.fullName]))
    return (id: string) => map.get(id) ?? id.slice(0, 8)
  }, [employees])

  function assignmentsFor(shiftId: string, date: string) {
    return assignments.filter(a => a.shiftId === shiftId && a.assignedDate === date)
  }

  const rosterRows = useMemo((): RosterRow[] => {
    return filteredShifts.map(shift => {
      const row: RosterRow = {
        id: shift.id,
        shiftLabel: shift.shiftName,
        shiftMeta: `${shift.startTime?.slice(0, 5)} – ${shift.endTime?.slice(0, 5)}${shift.location ? ` · ${shift.location}` : ''}`,
      }
      for (const date of days) {
        row[`day_${date}`] = date
      }
      return row
    })
  }, [filteredShifts, days])

  const rosterColumns = useMemo((): DataTableColumn<RosterRow>[] => {
    const base: DataTableColumn<RosterRow>[] = [
      {
        key: 'shiftLabel',
        header: 'Shift',
        sortable: false,
        render: (_v, row) => (
          <>
            <div>{row.shiftLabel}</div>
            <div className="text-xs text-neutral-500">{row.shiftMeta}</div>
          </>
        ),
      },
    ]
    const dayCols = days.map(
      (date): DataTableColumn<RosterRow> => ({
        key: `day_${date}` as keyof RosterRow & string,
        header: dayLabel(date),
        sortable: false,
        render: (_v, row) => {
          const shiftId = row.id
          const dayAssignments = assignmentsFor(shiftId, date)
          return (
            <ul className="space-y-1">
              {dayAssignments.map(a => (
                <li key={a.id} className="rounded bg-[var(--color-brand-50)] px-2 py-1 text-xs">
                  {employeeName(a.employeeId)}
                </li>
              ))}
              {canWrite && dayAssignments.length === 0 ? (
                <button
                  type="button"
                  className="text-xs text-[var(--color-brand-800)] hover:underline"
                  onClick={() => {
                    setAssignShiftId(shiftId)
                    setAssignDate(date)
                    setAssignOpen(true)
                  }}
                >
                  + Assign
                </button>
              ) : null}
            </ul>
          )
        },
      }),
    )
    return [...base, ...dayCols]
  }, [days, assignments, employees, canWrite])

  const createFormValues = { shiftName, startTime, endTime }
  const { errors: createErrors, valid: createValid, onBlur: onCreateBlur, validateAll: validateCreate } =
    useFieldValidation(createFormValues, {
      shiftName: v => (String(v ?? '').trim() ? undefined : 'Shift name is required.'),
      startTime: v => (String(v ?? '') ? undefined : 'Start time is required.'),
      endTime: v =>
        String(v ?? '') && String(v) > startTime ? undefined : 'End time must be after start time.',
    })

  const assignFormValues = { assignShiftId, assignEmployeeId, assignDate }
  const { errors: assignErrors, valid: assignValid, onBlur: onAssignBlur, validateAll: validateAssign } =
    useFieldValidation(assignFormValues, {
      assignShiftId: v => (String(v ?? '') ? undefined : 'Shift is required.'),
      assignEmployeeId: v => (String(v ?? '') ? undefined : 'Employee is required.'),
      assignDate: v => (String(v ?? '') ? undefined : 'Date is required.'),
    })

  async function handleCreateShift(e: FormEvent) {
    e.preventDefault()
    if (!validateCreate()) return
    setBusy(true)
    setError(null)
    try {
      await createShift({ shiftName, startTime, endTime, location: location || undefined })
      setCreateOpen(false)
      setShiftName('')
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault()
    if (!validateAssign()) return
    setBusy(true)
    setError(null)
    try {
      await assignShift(assignShiftId, { employeeId: assignEmployeeId, assignedDate: assignDate })
      setAssignOpen(false)
      await load()
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading && shifts.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="page-stack mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold text-neutral-900">Shift management</h1>
          <p className="mt-1 text-sm text-neutral-600">Weekly roster — assign staff to shifts by day.</p>
        </div>
        {canWrite ? (
          <div className="flex gap-2">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create shift
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAssignOpen(true)}>
              Assign staff
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <FormField label="Week starting" className="max-w-xs">
          <Input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
        </FormField>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
        >
          <option value="">All locations</option>
          {locations.map(loc => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={rosterColumns}
        rows={rosterRows}
        isLoading={loading}
        getRowKey={row => row.id}
        showSearch={false}
        showPagination={false}
        emptyStateLabel="No shifts defined. Create a shift to build the roster."
        noResultsLabel="No shifts match your filters"
        exportFilename="shift-roster"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create shift" size="sm">
        <form onSubmit={e => void handleCreateShift(e)}>
          <FormStack>
            <FormField label="Shift name" required error={createErrors.shiftName} valid={createValid.shiftName}>
              <Input
                value={shiftName}
                onChange={e => setShiftName(e.target.value)}
                onBlur={() => onCreateBlur('shiftName')}
                required
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start" required error={createErrors.startTime} valid={createValid.startTime}>
                <Input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  onBlur={() => onCreateBlur('startTime')}
                  required
                />
              </FormField>
              <FormField label="End" required error={createErrors.endTime} valid={createValid.endTime}>
                <Input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  onBlur={() => onCreateBlur('endTime')}
                  required
                />
              </FormField>
            </div>
            <FormField label="Location">
              <Input value={location} onChange={e => setLocation(e.target.value)} />
            </FormField>
          </FormStack>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Create'}
            </Button>
          </FormActions>
        </form>
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign staff to shift" size="sm">
        <form onSubmit={e => void handleAssign(e)}>
          <FormStack>
            <FormField label="Shift" required error={assignErrors.assignShiftId} valid={assignValid.assignShiftId}>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={assignShiftId}
                onChange={e => setAssignShiftId(e.target.value)}
                onBlur={() => onAssignBlur('assignShiftId')}
                required
              >
                <option value="">Select shift</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.shiftName} {s.location ? `(${s.location})` : ''}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Employee" required error={assignErrors.assignEmployeeId} valid={assignValid.assignEmployeeId}>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={assignEmployeeId}
                onChange={e => setAssignEmployeeId(e.target.value)}
                onBlur={() => onAssignBlur('assignEmployeeId')}
                required
              >
                <option value="">Select employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Date" required error={assignErrors.assignDate} valid={assignValid.assignDate}>
              <Input
                type="date"
                value={assignDate}
                onChange={e => setAssignDate(e.target.value)}
                onBlur={() => onAssignBlur('assignDate')}
                required
              />
            </FormField>
          </FormStack>
          <FormActions>
            <Button type="button" variant="ghost" onClick={() => setAssignOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Assigning…' : 'Assign'}
            </Button>
          </FormActions>
        </form>
      </Modal>
    </div>
  )
}
