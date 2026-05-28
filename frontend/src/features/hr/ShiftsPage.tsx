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
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'
import { usePermission } from '../../shared/hooks/usePermission'

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

  async function handleCreateShift(e: FormEvent) {
    e.preventDefault()
    if (!shiftName.trim()) {
      setError('Shift name is required.')
      return
    }
    if (startTime >= endTime) {
      setError('End time must be after start time.')
      return
    }
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
    if (!assignShiftId || !assignEmployeeId || !assignDate) {
      setError('Shift, employee, and date are required.')
      return
    }
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
        <label className="text-sm">
          Week starting
          <input
            type="date"
            className="ml-2 rounded border px-2 py-1"
            value={weekStart}
            onChange={e => setWeekStart(e.target.value)}
          />
        </label>
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

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2">Shift</th>
              {days.map(d => (
                <th key={d} className="px-3 py-2 whitespace-nowrap">
                  {dayLabel(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredShifts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-neutral-500">
                  No shifts defined. Create a shift to build the roster.
                </td>
              </tr>
            ) : (
              filteredShifts.map(shift => (
                <tr key={shift.id} className="border-t align-top">
                  <td className="px-3 py-2 font-medium">
                    <div>{shift.shiftName}</div>
                    <div className="text-xs text-neutral-500">
                      {shift.startTime?.slice(0, 5)} – {shift.endTime?.slice(0, 5)}
                      {shift.location ? ` · ${shift.location}` : ''}
                    </div>
                  </td>
                  {days.map(date => (
                    <td key={date} className="px-2 py-2">
                      <ul className="space-y-1">
                        {assignmentsFor(shift.id, date).map(a => (
                          <li key={a.id} className="rounded bg-[var(--color-brand-50)] px-2 py-1 text-xs">
                            {employeeName(a.employeeId)}
                          </li>
                        ))}
                        {canWrite && assignmentsFor(shift.id, date).length === 0 ? (
                          <button
                            type="button"
                            className="text-xs text-[var(--color-brand-800)] hover:underline"
                            onClick={() => {
                              setAssignShiftId(shift.id)
                              setAssignDate(date)
                              setAssignOpen(true)
                            }}
                          >
                            + Assign
                          </button>
                        ) : null}
                      </ul>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onSubmit={e => void handleCreateShift(e)}>
            <h2 className="mb-4 text-lg font-semibold">Create shift</h2>
            <label className="mb-3 block text-sm">
              Shift name
              <input className="mt-1 w-full rounded border px-3 py-2" value={shiftName} onChange={e => setShiftName(e.target.value)} required />
            </label>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="block text-sm">
                Start
                <input type="time" className="mt-1 w-full rounded border px-3 py-2" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </label>
              <label className="block text-sm">
                End
                <input type="time" className="mt-1 w-full rounded border px-3 py-2" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </label>
            </div>
            <label className="mb-4 block text-sm">
              Location
              <input className="mt-1 w-full rounded border px-3 py-2" value={location} onChange={e => setLocation(e.target.value)} />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {assignOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onSubmit={e => void handleAssign(e)}>
            <h2 className="mb-4 text-lg font-semibold">Assign staff to shift</h2>
            <label className="mb-3 block text-sm">
              Shift
              <select className="mt-1 w-full rounded border px-3 py-2" value={assignShiftId} onChange={e => setAssignShiftId(e.target.value)} required>
                <option value="">Select shift</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.shiftName} {s.location ? `(${s.location})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              Employee
              <select className="mt-1 w-full rounded border px-3 py-2" value={assignEmployeeId} onChange={e => setAssignEmployeeId(e.target.value)} required>
                <option value="">Select employee</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-4 block text-sm">
              Date
              <input type="date" className="mt-1 w-full rounded border px-3 py-2" value={assignDate} onChange={e => setAssignDate(e.target.value)} required />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAssignOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Assigning…' : 'Assign'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
