import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { verifyMomoPayment, type MomoProvider } from '../../shared/api/payments'
import { normalizeApiError } from '../../shared/api/errors'
import { useTillSession } from '../../hooks/useTillSession'
import { formatRwf } from '../../utils/currency'
import { useModalFocusTrap } from '../../shared/hooks/useModalFocusTrap'

const COUNTDOWN_SECONDS = 90

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ussdCode(provider: MomoProvider): string {
  if (provider === 'AIRTEL_MONEY') {
    return import.meta.env.VITE_AIRTEL_USSD_CODE?.trim() || '*185*9*1#'
  }
  return import.meta.env.VITE_MOMO_USSD_CODE?.trim() || '*182*8*1#'
}

function merchantCode(provider: MomoProvider, tillRegister?: string | null): string {
  const fromEnv =
    provider === 'AIRTEL_MONEY'
      ? import.meta.env.VITE_AIRTEL_MERCHANT_CODE?.trim()
      : import.meta.env.VITE_MOMO_MERCHANT_CODE?.trim()
  return fromEnv || tillRegister?.trim() || '—'
}

export interface MomoPaymentModalProps {
  open: boolean
  amount: number
  provider: MomoProvider
  onSuccess: (reference: string) => void
  onCancel: () => void
}

type Step = 1 | 2 | 3

export function MomoPaymentModal({ open, amount, provider, onSuccess, onCancel }: MomoPaymentModalProps) {
  const { session } = useTillSession()
  const [step, setStep] = useState<Step>(1)
  const [reference, setReference] = useState('')
  const [phone, setPhone] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const [timedOut, setTimedOut] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifiedRef, setVerifiedRef] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)
  const containerRef = useModalFocusTrap({ active: open, onEscape: onCancel })

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    setSecondsLeft(COUNTDOWN_SECONDS)
    setTimedOut(false)
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setTimedOut(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [clearTimer])

  useEffect(() => {
    if (!open) {
      clearTimer()
      setStep(1)
      setReference('')
      setPhone('')
      setError(null)
      setVerifiedRef(null)
      setTimedOut(false)
      setSecondsLeft(COUNTDOWN_SECONDS)
      return
    }
    return () => {
      clearTimer()
    }
  }, [open, clearTimer])

  useEffect(() => {
    if (step === 2 && open) {
      startTimer()
    } else {
      clearTimer()
    }
  }, [step, open, startTimer, clearTimer])

  const providerLabel = provider === 'AIRTEL_MONEY' ? 'Airtel Money' : 'MTN MoMo'

  const handleVerify = async () => {
    const code = reference.trim()
    if (!code) {
      setError('Enter the transaction reference from the customer’s phone.')
      return
    }
    if (timedOut) {
      setError('Timer expired. Restart the timer or choose another payment method.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await verifyMomoPayment({
        transactionCode: code,
        provider,
        amount,
        phoneNumber: phone.trim() || undefined,
      })
      if (result.status === 'CONFIRMED') {
        const ref = result.transactionCode ?? code
        setVerifiedRef(ref)
        setStep(3)
      } else {
        setError(result.message || 'Payment could not be verified.')
        setStep(3)
      }
    } catch (err) {
      setError(normalizeApiError(err).message)
      setStep(3)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return null
  }

  const dialCode = ussdCode(provider)
  const merchant = merchantCode(provider, session?.posRegisterCode)
  const progressPct = Math.round((secondsLeft / COUNTDOWN_SECONDS) * 100)

  return createPortal(
    <div
      ref={containerRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="momo-payment-title"
    >
      <div className="modal-panel modal-panel--md">
        <h2 id="momo-payment-title" className="m-0 text-lg font-semibold text-neutral-900">
          {providerLabel} payment
        </h2>
        <p className="mt-1 text-sm text-neutral-600">Amount due: {formatRwf(amount)}</p>

        {step === 1 && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="m-0 font-medium text-neutral-800">Step 1 — Customer dials</p>
            <div className="rounded-lg border border-[var(--border-subtle)] bg-neutral-50 p-3">
              <p className="m-0 text-xs text-neutral-500">USSD code</p>
              <p className="m-0 mt-1 font-mono text-lg font-semibold">{dialCode}</p>
              <p className="m-0 mt-3 text-xs text-neutral-500">Merchant / till number</p>
              <p className="m-0 mt-1 font-medium">{merchant}</p>
            </div>
            <p className="m-0 text-neutral-600">
              Ask the customer to complete the payment on their phone, then continue to enter the reference.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 rounded-md border border-[var(--border-default)] px-3 py-2 text-sm"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-md bg-[var(--color-brand-700)] px-3 py-2 text-sm font-medium text-white"
                onClick={() => setStep(2)}
              >
                Customer has dialled — enter reference
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="m-0 font-medium text-neutral-800">Step 2 — Verify reference</p>
            <div className="flex items-center justify-between gap-3">
              <div
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-[var(--color-brand-200)]"
                style={{
                  background: `conic-gradient(var(--color-brand-700) ${progressPct}%, #e5e7eb ${progressPct}% 100%)`,
                }}
                aria-hidden
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-semibold tabular-nums">
                  {timedOut ? '0:00' : formatCountdown(secondsLeft)}
                </span>
              </div>
              <p className="m-0 text-neutral-600">
                {timedOut
                  ? 'Time expired. Restart the timer or use another payment method.'
                  : 'Enter the MoMo reference before the timer runs out.'}
              </p>
            </div>
            <label className="block">
              Transaction reference
              <input
                className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2 font-mono text-sm"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={busy}
                autoFocus
              />
            </label>
            <label className="block">
              Customer phone <span className="text-neutral-400">(optional)</span>
              <input
                className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                disabled={busy}
              />
            </label>
            {error ? (
              <p className="m-0 rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            {timedOut ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--border-default)] px-3 py-2 text-sm"
                  onClick={() => {
                    setError(null)
                    startTimer()
                  }}
                >
                  Restart timer
                </button>
                <button type="button" className="rounded-md px-3 py-2 text-sm text-neutral-700" onClick={onCancel}>
                  Use different payment method
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={onCancel} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md bg-[var(--color-brand-700)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  onClick={() => void handleVerify()}
                  disabled={busy}
                >
                  {busy ? 'Verifying…' : 'Verify payment'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 space-y-3 text-sm">
            {verifiedRef ? (
              <>
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  <span className="font-medium">Payment verified</span>
                </div>
                <p className="m-0 text-neutral-600">
                  Reference: <span className="font-mono">{verifiedRef}</span>
                </p>
                <button
                  type="button"
                  className="w-full rounded-md bg-emerald-700 px-3 py-2.5 text-sm font-medium text-white"
                  onClick={() => onSuccess(verifiedRef)}
                >
                  Payment verified — complete sale
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-5 w-5" aria-hidden />
                  <span className="font-medium">Verification failed</span>
                </div>
                <p className="m-0 text-red-700">{error ?? 'Could not verify this reference.'}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                    onClick={() => {
                      setStep(2)
                      setError(null)
                      startTimer()
                    }}
                  >
                    Try again
                  </button>
                  <button type="button" className="flex-1 rounded-md px-3 py-2 text-sm" onClick={onCancel}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
