import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { refreshAccessToken } from '../../shared/api/auth'
import { useModalFocusTrap } from '../../shared/hooks/useModalFocusTrap'
import { signOut } from '../../shared/auth/signOut'
import { useAuthStore } from '../../shared/stores/authStore'

const WARNING_WINDOW_MS = 2 * 60 * 1000

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function SessionTimeoutManager() {
  const { t } = useTranslation()
  const { accessToken, refreshToken, expiresAt, tenantId, userId, setTokens } = useAuthStore()
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const sessionEndingRef = useRef(false)
  const hasActiveSession = Boolean(accessToken && expiresAt)
  const visibleRemainingMs = hasActiveSession ? remainingMs : null

  const endSession = useCallback(() => {
    if (sessionEndingRef.current) {
      return
    }
    sessionEndingRef.current = true
    void signOut().then(() => window.location.assign('/login'))
  }, [])

  const isOpen = Boolean(visibleRemainingMs !== null && visibleRemainingMs <= WARNING_WINDOW_MS)
  const dialogRef = useModalFocusTrap({
    active: isOpen,
    onEscape: endSession,
  })
  const countdownLabel = useMemo(() => {
    if (visibleRemainingMs === null) {
      return null
    }
    const seconds = Math.max(0, Math.ceil(visibleRemainingMs / 1000))
    return formatSeconds(seconds)
  }, [visibleRemainingMs])

  useEffect(() => {
    if (!hasActiveSession || !expiresAt) {
      return
    }

    const tick = () => {
      const next = expiresAt - Date.now()
      if (next <= 0) {
        endSession()
        return
      }
      setRemainingMs(next)
    }

    tick()
    const interval = window.setInterval(tick, 1_000)
    return () => window.clearInterval(interval)
  }, [endSession, expiresAt, hasActiveSession])

  async function onStaySignedIn() {
    if (!refreshToken) {
      endSession()
      return
    }

    setRefreshing(true)
    try {
      const next = await refreshAccessToken({ refreshToken, tenantId, userId })
      setTokens(next)
      setRemainingMs(next.expiresAt ? next.expiresAt - Date.now() : null)
    } catch {
      endSession()
      return
    } finally {
      setRefreshing(false)
    }
  }

  if (!isOpen || !countdownLabel) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <section
        ref={dialogRef}
        className="w-full max-w-md space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-[var(--shadow-card)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        tabIndex={-1}
      >
        <h2 id="session-timeout-title" className="m-0 font-[var(--font-display)] text-xl font-semibold text-neutral-900">
          {t('session.expiringTitle')}
        </h2>
        <p className="m-0 text-sm text-neutral-600">
          {t('session.expiringBody', { remaining: countdownLabel })}
        </p>
        <p className="sr-only" aria-live="polite">
          {t('session.expiringBody', { remaining: countdownLabel })}
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--border-default)] px-3 py-2 text-sm text-neutral-700"
            onClick={endSession}
          >
            {t('session.signOutNow')}
          </button>
          <button
            type="button"
            className="rounded-md bg-[var(--color-brand-700)] px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
            onClick={() => void onStaySignedIn()}
            disabled={refreshing}
          >
            {refreshing ? t('session.extending') : t('session.staySignedIn')}
          </button>
        </div>
      </section>
    </div>
  )
}
