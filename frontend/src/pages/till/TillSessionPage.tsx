import { useEffect, useState } from 'react'
import { useTillSession } from '../../hooks/useTillSession'
import { useAuthStore } from '../../shared/stores/authStore'
import { listLocations, listRegisters, type LocationDto, type RegisterDto } from '../../shared/api/locations'
import { openTillReportWindow } from '../../shared/api/tillSessions'
import { formatRwf, formatRwfInput, parseRwfInput } from '../../utils/currency'
import { CashCountModal } from '../../components/till/CashCountModal'
import { CloseTillModal } from '../../components/till/CloseTillModal'

export function TillSessionPage() {
  const userId = useAuthStore((s) => s.userId)
  const assignedRoles = useAuthStore((s) => s.assignedRoles)
  const cashierLabel =
    assignedRoles[0]?.name?.trim() ||
    (userId ? `Cashier (${userId.slice(0, 8)}…)` : 'Cashier')
  const { session, isOpen, loading, error, totals, openTill, closeTill, submitCashCount } =
    useTillSession()

  const [floatInput, setFloatInput] = useState('')
  const [locations, setLocations] = useState<LocationDto[]>([])
  const [registers, setRegisters] = useState<RegisterDto[]>([])
  const [locationId, setLocationId] = useState('')
  const [registerId, setRegisterId] = useState('')
  const [registerCode, setRegisterCode] = useState('REG-01')
  const [openError, setOpenError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)

  useEffect(() => {
    void listLocations()
      .then((rows) => {
        setLocations(rows)
        if (rows.length === 1) {
          setLocationId(rows[0].id)
        }
      })
      .catch(() => setLocations([]))
  }, [])

  useEffect(() => {
    if (!locationId) {
      setRegisters([])
      return
    }
    void listRegisters(locationId)
      .then((rows) => {
        setRegisters(rows)
        if (rows.length === 1) {
          setRegisterId(rows[0].id)
          setRegisterCode(rows[0].name)
        }
      })
      .catch(() => setRegisters([]))
  }, [locationId])

  const expectedDrawerCash =
    (session?.openingFloat ?? 0) + (totals?.expected?.cash ?? 0)

  const handleOpen = async () => {
    setOpenError(null)
    const openingFloat = parseRwfInput(floatInput)
    if (openingFloat < 0) {
      setOpenError('Enter a valid opening float')
      return
    }
    try {
      await openTill({
        posRegisterCode: registerCode.trim() || 'REG-01',
        openingFloat,
        locationId: locationId || undefined,
        registerId: registerId || undefined,
      })
      setToast('Till opened successfully')
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Failed to open till')
    }
  }

  const handleClose = async (closingCash: number, notes?: string) => {
    await closeTill(closingCash, notes)
    setToast('Till closed. Summary saved.')
  }

  if (loading && !session && !isOpen) {
    return <p className="text-sm text-neutral-500">Loading till session…</p>
  }

  return (
    <div className="page-container page-container--narrow space-y-6">
      <header className="page-header">
        <div>
          <h1 className="page-title">Till session</h1>
          <p className="page-lead">
            Open and close the register, record cash counts, and print X/Z reports.
          </p>
        </div>
      </header>

      {toast ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {toast}
        </p>
      ) : null}

      {(error || openError) && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {openError ?? error}
        </p>
      )}

      {!isOpen || !session ? (
        <section className="surface-card">
          <h2 className="m-0 text-lg font-semibold">Open till</h2>
          <p className="mt-1 text-sm text-neutral-600">No active session for your user.</p>

          <label className="mt-4 block text-sm">
            Opening float (RWF)
            <input
              type="text"
              inputMode="numeric"
              className="ui-input mt-1 tabular-nums"
              value={floatInput}
              onChange={(e) => setFloatInput(formatRwfInput(e.target.value))}
              placeholder="0"
            />
          </label>

          {locations.length > 0 ? (
            <>
              <label className="mt-3 block text-sm">
                Location
                <select
                  className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
              {registers.length > 0 ? (
                <label className="mt-3 block text-sm">
                  Register
                  <select
                    className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
                    value={registerId}
                    onChange={(e) => {
                      const id = e.target.value
                      setRegisterId(id)
                      const reg = registers.find((r) => r.id === id)
                      if (reg) {
                        setRegisterCode(reg.name)
                      }
                    }}
                  >
                    <option value="">Select register</option>
                    {registers.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="mt-3 block text-sm">
                  Register ID
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
                    value={registerCode}
                    onChange={(e) => setRegisterCode(e.target.value)}
                  />
                </label>
              )}
            </>
          ) : (
            <label className="mt-3 block text-sm">
              Register ID
              <input
                className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"
                value={registerCode}
                onChange={(e) => setRegisterCode(e.target.value)}
                placeholder="REG-01"
              />
            </label>
          )}

          <label className="mt-3 block text-sm">
            Cashier
            <input
              className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-neutral-50 px-3 py-2"
              value={cashierLabel}
              readOnly
            />
          </label>

          <button
            type="button"
            className="btn btn--primary btn--pay mt-5 w-full"
            disabled={loading}
            onClick={() => void handleOpen()}
          >
            {loading ? 'Opening…' : 'Open till'}
          </button>
        </section>
      ) : (
        <section className="space-y-4">
          <article className="surface-card">
            <h2 className="m-0 text-lg font-semibold text-emerald-800">Till open</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Session ID</dt>
                <dd className="font-mono text-xs">{session.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Opened</dt>
                <dd>{new Date(session.openedAt).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Register</dt>
                <dd>{session.posRegisterCode}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Opening float</dt>
                <dd className="tabular-nums">{formatRwf(session.openingFloat)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Cashier ID</dt>
                <dd className="font-mono text-xs">{session.cashierId}</dd>
              </div>
            </dl>
          </article>

          <div>
            <p className="m-0 mb-2 text-xs text-neutral-500">Totals refresh every 30 seconds</p>
            <div className="responsive-grid responsive-grid--2">
              <article className="stat-card">
                <span className="stat-card__label">Tender sales (today)</span>
                <span className="stat-card__value">{formatRwf(totals?.totalRwf ?? 0)}</span>
              </article>
              {totals?.lastCashCount ? (
                <article className="stat-card">
                  <span className="stat-card__label">Last cash count</span>
                  <span className="stat-card__value">{formatRwf(totals.lastCashCount.total)}</span>
                </article>
              ) : (
                <article className="stat-card">
                  <span className="stat-card__label">Cash count</span>
                  <span className="stat-card__value text-base font-medium text-neutral-500">Not recorded</span>
                </article>
              )}
            </div>
          </div>

          <div className="sticky-action-bar action-bar">
            <button type="button" className="btn" onClick={() => setCashModalOpen(true)}>
              Record cash count
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => openTillReportWindow(session.id, 'X')}
            >
              X report
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setCloseModalOpen(true)}>
              Close till
            </button>
          </div>
        </section>
      )}

      <CashCountModal
        open={cashModalOpen}
        onClose={() => setCashModalOpen(false)}
        onSubmit={submitCashCount}
      />

      {session ? (
        <CloseTillModal
          open={closeModalOpen}
          session={session}
          expectedCash={expectedDrawerCash}
          onClose={() => setCloseModalOpen(false)}
          onConfirm={handleClose}
        />
      ) : null}
    </div>
  )
}
